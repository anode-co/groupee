
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
 * type /channels for a full list of channels you can join
 * You are currently a guest - you can only join some channels

The main channels on this server are
{{ main_channels_names }}
`;

const reportAbuseEmail = 'report-abuse@example.com';

const mainChannelsNames = [
    'Off-Topic',
    'Town Square'
];

const questionAboutAcceptingRules = 'Do you accept the rules above?';

module.exports = {
    me: 'groupee', // name of the bot
    email: 'email_address_of_the_bot_user',
    passwd: 'bot_password',
    token: 'personal token, can be used instead of email + passwd',
    server: 'your.mattermost.server.tld',
    team: 'yourteam',
    wssPort: 443,
    httpPort: 80,
    templatingParams: {
        welcomeMessage,
        mainChannelsNames,
        reportAbuseEmail,
        questionAboutAcceptingRules,
        rulesRejectionRedirectionURL: 'https://rules-rejected.example.com',
        tour
    }
};