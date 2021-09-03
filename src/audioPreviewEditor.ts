import * as vscode from "vscode";
import { Disposable, disposeAll } from "./dispose";
import * as path from "path";
import { getNonce } from "./util";
import { WaveFile } from 'wavefile';

class AudioPreviewDocument extends Disposable implements vscode.CustomDocument {

    static async create(
        uri: vscode.Uri,
        backupId: string | undefined,
    ): Promise<AudioPreviewDocument | PromiseLike<AudioPreviewDocument>> {
        // If we have a backup, read that. Otherwise read the resource from the workspace
        const dataFile = typeof backupId === 'string' ? vscode.Uri.parse(backupId) : uri;
        const fileData = await AudioPreviewDocument.readFile(dataFile);
        try {
            const wav = new WaveFile(fileData);
            return new AudioPreviewDocument(uri, wav);
        } catch (err) {
            vscode.window.showErrorMessage(err.message);
            return new AudioPreviewDocument(uri, undefined);
        }
    }

    private static async readFile(uri: vscode.Uri): Promise<Uint8Array> {
        if (uri.scheme === 'untitled') {
            return new Uint8Array();
        }
        return vscode.workspace.fs.readFile(uri);
    }

    private readonly _uri: vscode.Uri;
    private _documentData: any;
    private _fsWatcher: vscode.FileSystemWatcher;

    private constructor (
        uri: vscode.Uri,
        initialContent: any
    ) {
        super();
        this._uri = uri;
        this._documentData = initialContent;
        this._fsWatcher = vscode.workspace.createFileSystemWatcher(uri.fsPath, true, false, true);
        this.onDidChange = this._fsWatcher.onDidChange;
    }

    public get uri() { return this._uri; }

    public onDidChange: vscode.Event<vscode.Uri>;

    public wavHeader(): any {
        if (!this._documentData) return;

        return {
            fmt: this._documentData.fmt,
            chunkSize: this._documentData.chunkSize,
        };
    }

    public prepareData(): any {
        try {
            // decompose
            switch (this._documentData.fmt.audioFormat) {
                case 1:
                case 3:
                    break;

                case 6:
                    this._documentData.fromALaw();
                    break;

                case 7:
                    this._documentData.fromMuLaw();
                    break;

                case 17:
                    this._documentData.fromIMAADPCM();
                    break;

                default:
                    throw new Error(`Unsupported audio format: ${this._documentData.fmt.audioFormat}`);
            }

            // load 
            const chNum = this._documentData.fmt.numChannels;
            let samples = this._documentData.getSamples(false, Float32Array);
            if (chNum === 1) {
                samples = [samples];
            }
            this._documentData.samples = samples;

            const sampleRate = this._documentData.fmt.sampleRate;
            const length = samples[0].length;
            return {
                sampleRate,
                numberOfChannels: chNum,
                length,
                duration: length / sampleRate
            };

        } catch (err) {
            vscode.window.showErrorMessage(err.message);
            return;
        }
    }

    // you have to prepareData before calling wavData
    public wavData(start: number, end: number): any {
        try {
            const chNum = this._documentData.fmt.numChannels;
            const samples = new Array(chNum);
            for (let ch = 0; ch < chNum; ch++) {
                samples[ch] = this._documentData.samples[ch].slice(start, end);
            }

            // convert to [-1,1] float32
            if (this._documentData.fmt.audioFormat === 1) {
                const max = 1 << (this._documentData.fmt.bitsPerSample - 1);
                for (let ch = 0; ch < chNum; ch++) {
                    for (let i = 0; i < samples[ch].length; i++) {
                        const v = samples[ch][i];
                        samples[ch][i] = v < 0 ? v / max : v / (max - 1);
                    }
                }
            }

            return {
                samples,
                length: samples[0].length,
                numberOfChannels: chNum,
                start,
                end
            };

        } catch (err) {
            vscode.window.showErrorMessage(err.message);
            return;
        }
    }

    public async reload() {
        const fileData = await AudioPreviewDocument.readFile(this._uri);
        try {
            this._documentData = new WaveFile(fileData);
        } catch (err) {
            vscode.window.showErrorMessage(err.message);
            this._documentData = undefined;
        }
    }

    private readonly _onDidDispose = this._register(new vscode.EventEmitter<void>());
    public readonly onDidDispose = this._onDidDispose.event;

    /**
     * Called by VS Code when there are no more references to the document.
     * 
     * This happens when all editors for it have been closed.
     */
    dispose(): void {
        this._onDidDispose.fire();
        super.dispose();
    }
}

export class AudioPreviewEditorProvider implements vscode.CustomReadonlyEditorProvider {

    public static register(context: vscode.ExtensionContext): vscode.Disposable {
        return vscode.window.registerCustomEditorProvider(
            AudioPreviewEditorProvider.viewType,
            new AudioPreviewEditorProvider(context),
            {
                supportsMultipleEditorsPerDocument: false,
                webviewOptions: {
                    retainContextWhenHidden: true,
                }
            }
        );
    }

    private static readonly viewType = 'wavPreview.audioPreview';

    private readonly webviews = new WebviewCollection();

    constructor (
        private readonly _context: vscode.ExtensionContext
    ) { }

    async openCustomDocument(
        uri: vscode.Uri,
        openContext: { backupId?: string },
        _token: vscode.CancellationToken
    ): Promise<AudioPreviewDocument> {
        const document: AudioPreviewDocument = await AudioPreviewDocument.create(
            uri,
            openContext.backupId
        );

        const listeners: vscode.Disposable[] = [];

        listeners.push(document.onDidChange(async (e) => {
            await document.reload();
            for (const webviewPanel of this.webviews.get(document.uri)) {
                webviewPanel.webview.postMessage({
                    type: "reload"
                });
            }
        }));

        document.onDidDispose(() => disposeAll(listeners));

        return document;
    }

    async resolveCustomEditor(
        document: AudioPreviewDocument,
        webviewPanel: vscode.WebviewPanel,
        _token: vscode.CancellationToken
    ): Promise<void> {
        // Add the webview to our internal set of active webviews
        this.webviews.add(document.uri, webviewPanel);

        // Setup initial content for the webview
        webviewPanel.webview.options = {
            enableScripts: true,
        };
        webviewPanel.webview.html = this.getHtmlForWebview(webviewPanel.webview);

        // Wait for the webview to be properly ready before we init
        webviewPanel.webview.onDidReceiveMessage(e => {
            switch (e.type) {
                case "ready":
                    webviewPanel.webview.postMessage({
                        type: "info",
                        data: document.wavHeader(),
                        isTrusted: vscode.workspace.isTrusted
                    });
                    break;

                case "prepare":
                    webviewPanel.webview.postMessage({
                        type: "prepare",
                        data: document.prepareData()
                    });
                    break;

                case "play":
                    webviewPanel.webview.postMessage({
                        type: "data",
                        data: document.wavData(e.start, e.end)
                    });
                    break;
            }
        });
    }

    /**
     * Get the static HTML used for in our editor's webviews.
     */
    private getHtmlForWebview(webview: vscode.Webview): string {
        // Local path to script and css for the webview
        const scriptUri = webview.asWebviewUri(vscode.Uri.file(
            path.join(this._context.extensionPath, 'media', 'audioPreview.js')
        ));
        const styleVSCodeUri = webview.asWebviewUri(vscode.Uri.file(
            path.join(this._context.extensionPath, 'media', 'vscode.css')
        ));
        const styleMainUri = webview.asWebviewUri(vscode.Uri.file(
            path.join(this._context.extensionPath, 'media', 'audioPreview.css')
        ));

        // Use a nonce to whitelist which scripts can be run
        const nonce = getNonce();

        return /* html */`
            <!DOCTYPE html>
			<html lang="en">
            <head>
                <meta charset="UTF-8">
                
                <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource} blob:; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">
                
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                
                <link href="${styleVSCodeUri}" rel="stylesheet" />
				<link href="${styleMainUri}" rel="stylesheet" />
                
                <title>Wav Preview</title>
            </head>
            <body>
                <table id="info-table">
                    <tr><th>Key</th><th>Value</th></tr>
                </table>

                <button id="listen-button">play</button>
                <input type="range" id="seek-bar" value="0" />
                <div id="decode-state"></div>

                <div id="message"></div>

                <script nonce="${nonce}" src="${scriptUri}"></script>
            </body>
			</html>
        `;
    }
}

/**
 * Tracks all webviews.
 */
class WebviewCollection {

    private readonly _webviews = new Set<{
        readonly resource: string;
        readonly webviewPanel: vscode.WebviewPanel;
    }>();

    /**
     * Get all known webviews for a given uri.
     */
    public *get(uri: vscode.Uri): Iterable<vscode.WebviewPanel> {
        const key = uri.toString();
        for (const entry of this._webviews) {
            if (entry.resource === key) {
                yield entry.webviewPanel;
            }
        }
    }

    /**
     * Add a new webview to the collection.
     */
    public add(uri: vscode.Uri, webviewPanel: vscode.WebviewPanel) {
        const entry = { resource: uri.toString(), webviewPanel };
        this._webviews.add(entry);

        webviewPanel.onDidDispose(() => {
            this._webviews.delete(entry);
        });
    }
}