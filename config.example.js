
const tour = `
 - The main channels on this server are
{{ main_channels_names }}

 - You are currently a guest
`;

const labelAcceptRules = 'Yes, I do accept the rules.';

const mainChannelsNames = [
    'Off-Topic',
    'Town Square'
];

const promotedGuestSuccessfully = 'Guest @{{ username }} has been successfully promoted.';

const questionAboutAcceptingRules = 'Do you accept the rules above?';

const reportAbuseEmail = 'report-abuse@example.com';

const updatedAcceptedRulesMessage = 'Thank you for having accepting the rules';

const welcomeMessage = `
Hey {{ screen_name }}!

Welcome to this MatterFOSS instance.

Please find the server rules below:
 - rule 1
 - rule 2
 - ...

Abuses can be reported by email at {{ report_abuse_email }}
`;

export default {
    me: 'groupee', // name of the bot
    email: 'email_address_of_the_bot_user',
    passwd: 'bot_password',
    token: 'personal token, can be used instead of email + passwd',
    server: 'your.mattermost.server.tld',
    team: 'yourteam',
    wssPort: 443,
    httpPort: 80,
    externalScheme: "https",
    externalHost: "staging.pkt.chat",
    externalPort: "443",
    // A prefix to be added to the route paths
    externalRoutePrefix: '',
    serverPort: 3000,
    // Required for interactive messages
    interactiveMessagesToken: "FILL ME",
    // "new_user" event handling will only affect users
    // having username satisfying the following prefix
    username_prefix: '',
    templatingParams: {
        labelAcceptRules,
        mainChannelsNames,
        reportAbuseEmail,
        rulesRejectionRedirectionURL: 'https://rules-rejected.example.com',
        promotedGuestSuccessfully,
        questionAboutAcceptingRules,
        tour,
        updatedAcceptedRulesMessage,
        welcomeMessage
    }
};
