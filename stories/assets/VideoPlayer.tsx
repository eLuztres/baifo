'use client';

import * as React from 'react';
import ReactPlayer from 'react-player';

interface LocalVideoProps {
    remoteUrl: string;
    fileName?: string;
}

export default function LocalVideo({ remoteUrl, fileName = 'video.mp4' }: LocalVideoProps) {
    const [localUrl, setLocalUrl] = React.useState<string | null>(null);

    React.useEffect(() => {
        async function loadVideo() {
            try {
                const res = await fetch(remoteUrl);
                const blob = await res.blob();

                // Optional: force file type if unknown
                const typedBlob = new Blob([blob], { type: 'video/mp4' });

                const url = URL.createObjectURL(typedBlob);
                setLocalUrl(url);

                return () => URL.revokeObjectURL(url); // cleanup
            } catch (err) {
                console.error('Failed to load video:', err);
            }
        }

        loadVideo();
    }, [remoteUrl]);

    if (!localUrl) {
        return <div>Loading video...</div>;
    }

    return (
        <>
            <video
                controls
                autoPlay
                muted
                loop
                playsInline
                preload="auto"
                style={{ width: '100%', maxWidth: '500px' }}
            >
                <source src={localUrl} type="video/mp4" />
                Your browser does not support the video tag.
            </video>

            <ReactPlayer
                src="LightStone.mp4"
                playing
                muted
                loop
                controls
                width="100%"
                height="auto"
            />
        </>
    );
}
