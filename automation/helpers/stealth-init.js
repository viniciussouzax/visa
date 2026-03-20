'use strict';

async function applyStealthInitScript(context) {
    await context.addInitScript(() => {
        const getParameter = WebGLRenderingContext.prototype.getParameter;
        WebGLRenderingContext.prototype.getParameter = function(param) {
            if (param === 37445) return 'Google Inc. (NVIDIA)';
            if (param === 37446) return 'ANGLE (NVIDIA, NVIDIA GeForce GTX 1660 SUPER Direct3D11 vs_5_0 ps_5_0, D3D11)';
            return getParameter.call(this, param);
        };
        if (typeof WebGL2RenderingContext !== 'undefined') {
            const getParam2 = WebGL2RenderingContext.prototype.getParameter;
            WebGL2RenderingContext.prototype.getParameter = function(param) {
                if (param === 37445) return 'Google Inc. (NVIDIA)';
                if (param === 37446) return 'ANGLE (NVIDIA, NVIDIA GeForce GTX 1660 SUPER Direct3D11 vs_5_0 ps_5_0, D3D11)';
                return getParam2.call(this, param);
            };
        }

        Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => [4, 6, 8][Math.floor(Math.random() * 3)] });
        Object.defineProperty(navigator, 'deviceMemory', { get: () => [4, 8][Math.floor(Math.random() * 2)] });

        if (navigator.connection) {
            Object.defineProperty(navigator.connection, 'effectiveType', { get: () => '4g' });
            Object.defineProperty(navigator.connection, 'rtt', { get: () => 50 + Math.floor(Math.random() * 100) });
            Object.defineProperty(navigator.connection, 'downlink', { get: () => 5 + Math.random() * 15 });
        }

        Object.defineProperty(navigator, 'platform', { get: () => 'Win32' });

        Object.defineProperty(navigator, 'plugins', {
            get: () => {
                const plugins = [
                    { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
                    { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai', description: '' },
                    { name: 'Native Client', filename: 'internal-nacl-plugin', description: '' },
                    { name: 'Widevine Content Decryption Module', filename: 'widevinecdmadapter.dll', description: 'Widevine Content Decryption Module' },
                ];

                const pluginArray = {
                    length: plugins.length,
                    item: (index) => plugins[index] || null,
                    namedItem: (name) => plugins.find(p => p.name === name) || null,
                    refresh: () => {},
                    [Symbol.iterator]: function* () { yield* plugins; },
                };

                plugins.forEach((plugin, index) => {
                    pluginArray[index] = plugin;
                });

                Object.defineProperty(pluginArray, 'length', {
                    get: () => plugins.length,
                    enumerable: true,
                });

                return pluginArray;
            },
        });

        const origGetImageData = CanvasRenderingContext2D.prototype.getImageData;
        CanvasRenderingContext2D.prototype.getImageData = function(...args) {
            const imageData = origGetImageData.apply(this, args);
            const data = imageData.data;
            if (data.length < 500000) {
                for (let i = 0; i < data.length; i += 4) {
                    const noise = Math.random() < 0.5 ? 1 : -1;
                    data[i] = (data[i] + noise) & 0xFF;
                    data[i + 1] = (data[i + 1] + noise) & 0xFF;
                    data[i + 2] = (data[i + 2] + noise) & 0xFF;
                }
            }
            return imageData;
        };

        const origToDataURL = HTMLCanvasElement.prototype.toDataURL;
        HTMLCanvasElement.prototype.toDataURL = function() {
            if (this.width < 400 && this.height < 400) {
                const ctx = this.getContext('2d');
                if (ctx) {
                    const img = origGetImageData.call(ctx, 0, 0, this.width, this.height);
                    const d = img.data;
                    for (let i = 0; i < d.length; i += 4) {
                        d[i] = (d[i] + (Math.random() < 0.5 ? 1 : -1)) & 0xFF;
                    }
                    ctx.putImageData(img, 0, 0);
                }
            }
            return origToDataURL.apply(this, arguments);
        };

        if (typeof RTCPeerConnection !== 'undefined') {
            const OrigRTC = RTCPeerConnection;
            window.RTCPeerConnection = function(config, constraints) {
                if (config && config.iceServers) {
                    config.iceTransportPolicy = 'relay';
                }
                const pc = new OrigRTC(config, constraints);
                const origCreateOffer = pc.createOffer.bind(pc);
                pc.createOffer = function(opts) {
                    return origCreateOffer(opts).then(offer => {
                        if (offer && offer.sdp) {
                            offer.sdp = offer.sdp.replace(/a=candidate:.*?\r?\n/g, '');
                        }
                        return offer;
                    });
                };
                const origCreateAnswer = pc.createAnswer.bind(pc);
                pc.createAnswer = function(opts) {
                    return origCreateAnswer(opts).then(answer => {
                        if (answer && answer.sdp) {
                            answer.sdp = answer.sdp.replace(/a=candidate:.*?\r?\n/g, '');
                        }
                        return answer;
                    });
                };
                return pc;
            };
            window.RTCPeerConnection.prototype = OrigRTC.prototype;
            if (window.webkitRTCPeerConnection) {
                window.webkitRTCPeerConnection = window.RTCPeerConnection;
            }
        }

        if (typeof AudioContext !== 'undefined' || typeof webkitAudioContext !== 'undefined') {
            const AudioCtor = window.AudioContext || window.webkitAudioContext;
            const origCreateAnalyser = AudioCtor.prototype.createAnalyser;
            AudioCtor.prototype.createAnalyser = function() {
                const analyser = origCreateAnalyser.apply(this, arguments);
                const origGetFloat = analyser.getFloatFrequencyData.bind(analyser);
                analyser.getFloatFrequencyData = function(array) {
                    origGetFloat(array);
                    for (let i = 0; i < array.length; i++) {
                        array[i] += (Math.random() - 0.5) * 0.01;
                    }
                };
                return analyser;
            };
            const origCreateOsc = AudioCtor.prototype.createOscillator;
            AudioCtor.prototype.createOscillator = function() {
                const osc = origCreateOsc.apply(this, arguments);
                const origDetune = Object.getOwnPropertyDescriptor(OscillatorNode.prototype, 'detune');
                if (origDetune && origDetune.get) {
                    const origDetuneValue = osc.detune;
                    if (origDetuneValue && origDetuneValue.value !== undefined) {
                        origDetuneValue.value += (Math.random() - 0.5) * 0.001;
                    }
                }
                return osc;
            };
        }

        if (!window.chrome) {
            window.chrome = {};
        }
        if (!window.chrome.runtime) {
            window.chrome.runtime = {
                connect: () => {},
                sendMessage: () => {},
                onMessage: { addListener: () => {}, removeListener: () => {} },
                id: undefined,
            };
        }
        window.chrome.loadTimes = window.chrome.loadTimes || function() {
            return { commitLoadTime: Date.now() / 1000, connectionInfo: 'http/1.1' };
        };
        window.chrome.csi = window.chrome.csi || function() {
            return { startE: Date.now(), onloadT: Date.now() + 300 };
        };
        window.chrome.app = window.chrome.app || {
            isInstalled: false,
            InstallState: { DISABLED: 'disabled', INSTALLED: 'installed' },
            RunningState: { CANNOT_RUN: 'cannot_run', READY_TO_RUN: 'ready_to_run' },
        };
    });
}

module.exports = { applyStealthInitScript };
