
const welcomeMessage = `
Hey {{ screen_name }}!

Welcome to this MatterFOSS instance.

The main channels are:
{{ main_channels_names }}

Please find the server rules below:
 - rule 1
 - rule 2
 - ...

Abuses can be reported by email at {{ report_abuse_email }}
`;

const reportAbuseEmail = 'report-abuse@example.com';

const mainChannelsNames = [
    'Off-Topic',
    'Town Square'
];

module.exports = {
    me: 'groupee', // name of the bot
    email: 'email_address_of_the_bot_user',
    passwd: 'bot_password',
    token: 'personal token, can be used instead of email + passwd',
    server: 'your.mattermost.server.tld',
    team: 'yourteam',
    wssPort: 443,
    httpPort: 80,
    welcomeMessage,
    mainChannelsNames,
    reportAbuseEmail
};