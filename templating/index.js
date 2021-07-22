
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

export default {
    formatTourMessage,
    formatWelcomeMessage
};