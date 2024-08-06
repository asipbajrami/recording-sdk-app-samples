import React, { useEffect, useRef, useState } from "react";
import { DyteProvider, useDyteClient } from "@dytesdk/react-web-core";
import { DyteGrid, DyteParticipantsAudio, DyteSpinner, defaultConfig } from "@dytesdk/react-ui-kit";
import {
    generateConfig,
    provideDyteDesignSystem,
    UIConfig,
} from "@dytesdk/ui-kit";
import { MeetingConfig } from "../types";

import { DyteRecording } from "@dytesdk/recording-sdk";

const defaultUIConfig: UIConfig = {
    ...defaultConfig,
    designTokens: {
        borderRadius: 'rounded',
        borderWidth: 'thin',
        spacingBase: 4,
        theme: 'dark',
        logo: '',
        colors: {
            brand: {
                '300': '#023dd0',
                '400': '#0248f5',
                '500': '#2160fd',
                '600': '#3e75fd',
                '700': '#5c8afe',
            },
            background: {
                '600': '#222222',
                '700': '#1f1f1f',
                '800': '#1b1b1b',
                '900': '#181818',
                '1000': '#141414',
            },
            danger: '#FF2D2D',
            text: '#EEEEEE',
            'text-on-brand': '#EEEEEE',
            success: '#62A504',
            'video-bg': '#191919',
            warning: '#FFCD07',
        },
    }
}

export default function UIKitMeeting(props: {
    roomName: string;
    authToken: string;
    config: MeetingConfig;
    apiBase: string | null;
}) {
    const { roomName, authToken, config, apiBase } = props;
    const [uiconfig, setuiconfig] = useState<UIConfig | null>(null);
    const [client, initClient] = useDyteClient();
    const [overrides, setOverrides] = useState({});
    const elementRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if(!authToken){
            return;
        }
        async function setupDyteMeeting(){
            const recordingSDK = new DyteRecording({ });
            const meetingObj = await initClient({
                roomName,
                authToken,
                defaults: {
                    audio: false,
                    video: false,
                },
                apiBase: apiBase ?? 'https://api.cluster.dyte.in',
            });
            await recordingSDK.init(meetingObj);
        }
        setupDyteMeeting();

    }, [authToken]);

    useEffect(() => {
        if (client !== undefined) {
            let uiKitConfig: UIConfig = { ...defaultUIConfig };

            try {
                const presetConfig = client.self.suggestedTheme;
                uiKitConfig = generateConfig(presetConfig).config;
            } catch (error) {
                console.error("Error generating config:", error);
            }

            if ((client as any).__internals__?.features?.hasFeature('video_subscription_override')) {
                console.log('enable video subscription override');
                try {
                    const overrides = JSON.parse((client as any).__internals__.features.getFeatureValue('video_subscription_override'));
                    const preset = overrides[client.self.organizationId] ?? [];
                    console.log('subscription override', preset);
                    if (preset && preset.length > 0) {
                        setOverrides({ videoUnsubscribed: { preset }});
                    }
                } catch (error) {
                    console.error("Error setting overrides:", error);
                }
            }

            if (uiKitConfig.root) {
                uiKitConfig.root["dyte-mixed-grid"] = {
                    states: ["activeSpotlight"],
                    children: [
                        ["dyte-simple-grid", { style: { width: "15%" } }],
                    ],
                };

                uiKitConfig.root["dyte-mixed-grid.activeSpotlight"] = [
                    ["dyte-spotlight-grid", { style: { width: "15%" }, layout: "column" }],
                ];

                // Customize the name tag to include user ID
                uiKitConfig.root["dyte-name-tag"] = {
                    props: {
                        // Use a custom name format function
                        nameFormatter: (name: string, id: string) => `${name} (${id})`,
                    },
                };
            }

            setuiconfig(uiKitConfig);
        }
    }, [client, config]);

    useEffect(() => {
        if (elementRef.current && uiconfig && uiconfig.designTokens) {
            provideDyteDesignSystem(elementRef.current, uiconfig.designTokens);
        }
    }, [elementRef, uiconfig]);

    if (!client || !uiconfig) {
        return (
            <div style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                height: "100vh",
            }}>
                <DyteSpinner />
            </div>
        );
    }

    return (
        <div
            style={{
                width: "100vw",
                height: "100vh",
                backgroundColor:
                    "rgba(var(--dyte-colors-background-1000, 8 8 8))",
            }}
            ref={elementRef}
        >
            <DyteGrid
                config={uiconfig}
                meeting={client}
                overrides={overrides}
            />
            <DyteParticipantsAudio meeting={client} />
        </div>
    );
}