
const formatWelcomeMessage = (message, params) => {
    return message
        .replace(
            '{{ screen_name }}',
            params.screen_name
        )
        .replace(
            '{{ report_abuse_email }}',
            params.report_abuse_email
        );
};

const formatTourMessage = (message, params) => {
    return message
        .replace(
            '{{ main_channels_names }}',
            params.main_channels_names
                .map(name => `    - ~${name}`)
                .join("\n")
        );
};

const messageAttachmentsProps = ({text, url, actionId, buttonLabel}) => {
    return {
        attachments: [
            {
                text,
                actions: [
                    {
                        "id": actionId,
                        "name": buttonLabel,
                        integration: {
                            url,
                            "context": {
                                "action": actionId,
                            }
                        }
                    }
                ]
            }
        ]
    };
};

export default {
    formatTourMessage,
    formatWelcomeMessage,
    messageAttachmentsProps
};