
const welcomeMessage = `
Hey {{ screen_name }}!

Welcome to this MatterFOSS instance.

Please find the server rules below:
 - rule 1
 - rule 2
 - ...

Abuses can be reported by email at {{ report_abuse_email }}
`;

const tour = `
 - The main channels on this server are
{{ main_channels_names }}

 - You are currently a guest - you can only join some channels
`;

const reportAbuseEmail = 'report-abuse@example.com';

const mainChannelsNames = [
    'Off-Topic',
    'Town Square'
];

const questionAboutAcceptingRules = 'Do you accept the rules above?';

const labelAcceptRules = 'Yes, I do accept the rules.';

const updatedAcceptedRulesMessage = 'Thank you for having accepting the rules';

export default {
    me: 'groupee', // name of the bot
    email: 'email_address_of_the_bot_user',
    passwd: 'bot_password',
    token: 'personal token, can be used instead of email + passwd',
    server: 'your.mattermost.server.tld',
    team: 'yourteam',
    wssPort: 443,
    httpPort: 80,
    serverPort: 3000,
    templatingParams: {
        labelAcceptRules,
        mainChannelsNames,
        reportAbuseEmail,
        rulesRejectionRedirectionURL: 'https://rules-rejected.example.com',
        questionAboutAcceptingRules,
        tour,
        updatedAcceptedRulesMessage,
        welcomeMessage,
    }
};