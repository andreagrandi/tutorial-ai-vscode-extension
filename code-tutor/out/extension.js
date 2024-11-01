"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = __importStar(require("vscode"));
const ANNOTATION_PROMPT = `You are a code tutor who helps students learn how to write better code. Your job is to evaluate a block of code that the user gives you and then annotate any lines that could be improved with a brief suggestion and the reason why you are making that suggestion. Only make suggestions when you feel the severity is enough that it will impact the readability and maintainability of the code. Be friendly with your suggestions and remember that these are students so they need gentle guidance. Format each suggestion as a single JSON object. It is not necessary to wrap your response in triple backticks. Here is an example of what your response should look like:

{ "line": 1, "suggestion": "I think you should use a for loop instead of a while loop. A for loop is more concise and easier to read." }{ "line": 12, "suggestion": "I think you should use a for loop instead of a while loop. A for loop is more concise and easier to read." }
`;
// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
function activate(context) {
    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log('Congratulations, your extension "code-tutor" is now active!');
    // The command has been defined in the package.json file
    // Now provide the implementation of the command with registerCommand
    // The commandId parameter must match the command field in package.json
    const disposable = vscode.commands.registerTextEditorCommand('code-tutor.annotate', async (textEditor) => {
        // Get the code with line numbers from the current editor
        const codeWithLineNumbers = getVisibleCodeWithLineNumbers(textEditor);
        // select the 4o chat model
        let [model] = await vscode.lm.selectChatModels({
            vendor: 'copilot',
            family: 'gpt-4o'
        });
        // init the chat message
        const messages = [
            vscode.LanguageModelChatMessage.User(ANNOTATION_PROMPT),
            vscode.LanguageModelChatMessage.User(codeWithLineNumbers)
        ];
        // make sure the model is available
        if (model) {
            // send the messages array to the model and get the response
            let chatResponse = await model.sendRequest(messages, {}, new vscode.CancellationTokenSource().token);
            // handle chat response
            await parseChatResponse(chatResponse, textEditor);
        }
    });
    context.subscriptions.push(disposable);
}
function applyDecoration(editor, line, suggestion) {
    const decorationType = vscode.window.createTextEditorDecorationType({
        after: {
            contentText: ` ${suggestion.substring(0, 25) + '...'}`,
            color: 'grey'
        }
    });
    // get the end of the line with the specified line number
    const lineLength = editor.document.lineAt(line - 1).text.length;
    const range = new vscode.Range(new vscode.Position(line - 1, lineLength), new vscode.Position(line - 1, lineLength));
    const decoration = { range: range, hoverMessage: suggestion };
    vscode.window.activeTextEditor?.setDecorations(decorationType, [decoration]);
}
async function parseChatResponse(chatResponse, textEditor) {
    let accumulatedResponse = '';
    for await (const fragment of chatResponse.text) {
        accumulatedResponse += fragment;
        // if the fragment is a }, we can try to parse the whole line
        if (fragment.includes('}')) {
            try {
                const annotation = JSON.parse(accumulatedResponse);
                applyDecoration(textEditor, annotation.line, annotation.suggestion);
                // reset the accumulator for the next line
                accumulatedResponse = '';
            }
            catch (e) {
                // do nothing
            }
        }
    }
}
function getVisibleCodeWithLineNumbers(textEditor) {
    // get the position of the first and last visible lines
    let currentLine = textEditor.visibleRanges[0].start.line;
    const endLine = textEditor.visibleRanges[0].end.line;
    let code = '';
    // get the text from the line at the current position.
    // The line number is 0-based, so we add 1 to it to make it 1-based.
    while (currentLine < endLine) {
        code += `${currentLine + 1}: ${textEditor.document.lineAt(currentLine).text} \n`;
        // move to the next line position
        currentLine++;
    }
    return code;
}
// This method is called when your extension is deactivated
function deactivate() { }
//# sourceMappingURL=extension.js.map