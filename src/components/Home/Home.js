import React, { useRef, useEffect, useCallback, useMemo } from 'react';
import * as cocoSsd from "@tensorflow-models/coco-ssd";
import "@tensorflow/tfjs";
import Speech from 'speak-tts'
import './Home.css';

const DETECT = "person";

let detectObject = false;
let saidIt = false;
const Home = (props) => {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    console.debug(process.platform)
    const say = useMemo(() => {
        const speech = new Speech()
        speech.init().then((data) => {
            // The "data" object contains the list of available voices and the voice synthesis params
            console.log("Speech is ready, voices are available", data)
        }).catch(e => {
            console.error("An error occured while initializing : ", e)
        });
        return speech;
    }, []);

    const detectFrame = useCallback((video, model) => {
        model.detect(video).then(predictions => {

            renderPredictions(predictions);
            if (predictions.find(({ class: detection, score }) => {
                return detection === DETECT && score > 0.5;
            })) {
                detectObject = true;
            } else {
                detectObject = false;
                saidIt = false;
            }

            if (detectObject && !saidIt) {
                saidIt = true;
                say.speak({ text: `Detected ${DETECT}` });
            }
            requestAnimationFrame(() => {
                detectFrame(video, model);
            });
        });
    }, [say])

    useEffect(() => {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            const webCamPromise = navigator.mediaDevices
                .getUserMedia({
                    audio: false,
                    video: {
                        facingMode: "user"
                    }
                })
                .then(stream => {
                    window.stream = stream;
                    videoRef.current.srcObject = stream;
                    return new Promise((resolve, reject) => {
                        videoRef.current.onloadedmetadata = () => {
                            resolve();
                        };
                    });
                });
            const modelPromise = cocoSsd.load();
            Promise.all([modelPromise, webCamPromise])
                .then(values => {
                    detectFrame(videoRef.current, values[0]);
                })
                .catch(error => {
                    console.error(error);
                });
        }
    }, [detectFrame])



    const renderPredictions = predictions => {
        const ctx = canvasRef.current.getContext("2d");
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        // Font options.
        const font = "16px sans-serif";
        ctx.font = font;
        ctx.textBaseline = "top";
        predictions.forEach(prediction => {
            const x = prediction.bbox[0];
            const y = prediction.bbox[1];
            const width = prediction.bbox[2];
            const height = prediction.bbox[3];
            // Draw the bounding box.
            ctx.strokeStyle = "#00FFFF";
            ctx.lineWidth = 4;
            ctx.strokeRect(x, y, width, height);
            // Draw the label background.
            ctx.fillStyle = "#00FFFF";
            const textWidth = ctx.measureText(prediction.class).width;
            const textHeight = parseInt(font, 10); // base 10
            ctx.fillRect(x, y, textWidth + 4, textHeight + 4);
        });

        predictions.forEach(prediction => {
            const x = prediction.bbox[0];
            const y = prediction.bbox[1];
            // Draw the text last to ensure it's on top.
            ctx.fillStyle = "#000000";
            ctx.fillText(prediction.class, x, y);
        });
    };

    return (<div>
        <video
            className="size"
            autoPlay
            playsInline
            muted
            ref={videoRef}
            width="600"
            height="500"
        />
        <canvas
            className="size"
            ref={canvasRef}
            width="600"
            height="500"
        />
    </div>)
}
export default Home;