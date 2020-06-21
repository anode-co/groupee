# Groupee

Group management bot for Mattermost based chats.

## How it works and how to use it
Groupee manages chats by making them into *groups*, which means you can "invite one channel into another".
Once groupee has been added to a channel by it's creator, that channel becomes a group which can be added
or given permissions on other groups.

There are 3 ways to create a group:

1. Create an ordinary private channel and then invite groupee to the channel (remember, you can't invite
groupee unless you're the actual creator of the channel)
2. Private message the `!chan` command to groupee to create a new group with you as the sole owner
3. Message the `!chan` command in an existing group to create a subgroup whose membership includes the
parent group.

### The !chan command
The `!chan` command takes one argument which is the name of the to-be-group, that name must consist only
of capital and lower case letters and the underscore. All other characters will be replaced with underscores.

If you send a `!chan` command in a *private message* to groupee, then groupee will create a new group and
you will be the sole owner and member. For example, if you send a private message to groupee saying
`!chan group_testing_123` then groupee will create a new group called `#group_testing_123`.

If you send the `!chan` command in a *group*, then groupee will create a new group with the name of the
old group plus a dash and the name you gave in the chan command. For example, if you are in a group called
`#hr` and you type `!chan recruiting` then groupee will create a new group called `#hr-recruiting`.
Following the example, the group `#hr` will become a member of the group `#hr-recruiting` and the
pseudo-group `#hr/owners` will become an owner of `#hr-recruiting`. Importantly, you will also become an
owner of `#hr-recruiting`, so even if you are not an owner of `#hr`, you can still spawn a sub-group
and have control over it.

### !add, !op, !remove and !deop
The `!add` and `!op` commands allow you to add people and groups to groups, and likewise the `!remove`
and `!deop` commands allow you to remove them. All of the commands accept a list of groups and/or users
and must be made in the group where you are to perform the operation.

Once a room has been converted to a managed group, you are nolonger allowed to add a person to the room
directly, instead you must use the `!add` command, furthermore, you must be an owner of a group in order
to invoke any of these commands.

The `!remove` command will only allow you to manipulate the members who are directly added to a group,
users who exist in a group due to transitive inclusion must be removed from the group where they were
originally added. For example, if you Alan is a member of `#hr` but you do not want them to see what goes
on inside of `#hr-recruiting`, then you must either remove them from `#hr` or you must make a recruiting
chat which does not specify that members of `#hr` are included. In this case you might use `!chan` in a
*private message* and then use `!add` with only the people who you trust to discuss recruiting.

If you use the `!remove` command but you find that the person you attempted to remove does not go away,
this is probably because they have justifications for membership in your group through multiple group
memberships. You can use the `!info` command to see which memberships are causing them to be present.

The `!deop` command is also somewhat complex because it can allow two potential bad situations. Firstly
it is possible to make yourself nolonger an owner of the group where you are invoking it and secondly it
can potentially lead to a group with no owners at all. In the first scenario, you will be warned and
the `!deop` command will only do the job if you pass the `-yes` flag as one of the arguments. In the
second scenario, groupee will simply reduce to perform the operation and advise you that if you wish to
remove the channel entirely, you should use the `!del` command.

### !info and !allusers
These two commands are used for getting information about what's going on. The `!info` command gives the
members and owners of a group, while the `!allusers` lists all of the actual people who are authorized
to be in the group, as well as the group membership which justifies their presence.

Both the `!info` and `!allusers` commands require you to be a member of the channel which is being
queried about. However, the `!allusers` command, sent in a private message to groupee, with no arguments,
displays a simple list of all of the users known to the system. In this context it is available to
everyone.

### The /owners pseudo-group
Every group has a pseudo-group called `<channel_name>/owners`, this pseudo-group is the set of every
user and group which has been added to said group using the `!op` command. While the owners group is
not an actual chat channel and cannot be joined in the traditional sense, it can be treated as a group
for the purposes of adding and removing from other groups. For example, if you wanted to create a group
with all of the owners of the `#hr` group, you could invoke `!add #hr/owners` and only the owners of
the `#hr` group would be added. Likewise, by invoking `!op #hr`, you can make all members of the `#hr`
group into owners of your newly created group. A very common use case is to make the owners of one
group (e.g. `#hr`) also be the owners of another group (e.g. `#hr-recruiting`), while the `!chan`
command does this for you, you can also do it manually by invoking `!add #hr` and then `!op #hr/owners`.

### !evict and !del
The `!evict` command is just for checking that anyone who doesn't have authorization to be in a given
room isn't there. It is possible that a person is manually added to a room while groupee is down for
maintainence so `!evict` will check that there are no unauthorized participants in a given room. The
`!evict` command must be used from the room where you mean to evict.

The `!del` command is a bit more important, it is necessary in order to be able to remove a channel
both from the database and to delete it in mattermost. Like `!deop` it is a risky command to invoke
because if you are an owner of the channel, then it will destroy the channel without confirming.
There is one case when `!del` will not work, that is if there are other groups which include the
current group in their membership, in which case those rooms must be deleted first.

### !tree
The `!tree` command shows a tree of people and groups and their relationships. People are shown as
blue ovals while groups are shown as green squares. The membership and permissions are as follows:

<p align="center">
<img src="https://github.com/anode-co/groupee/raw/master/doc/groupee_legend.png" width="40%">
 <br/>
 The color of the connecting line indicates the type of permission which a user or group has in a group.
</p>

#### !tree example
We'll consider the example of the ACME Company. In the ACME company, there are two teams, HR and Tech.
Alice and Bob are founders, Catherine is the manager of HR and Dave is Catherine's assistant.
Eleanor works in the technical team but is not a manager. The technical team has two projects a website
and a mobile app. Fred is an outside contractor who is working on the mobile app while Gloria is a
contractor working on the website. The `!tree` as seen by Alice or Bob appears like this:

![tree example](https://github.com/anode-co/groupee/raw/master/doc/groupee_example.png "Tree example")

* Alice and Bob are *owners* of the `~founders` group.
* Catherine being a manager of the HR team, is an *owner* of the `~hr` group, but because owners of
the `~founders` group are also owners of the `~hr` group, Alice and Bob can have ownership over the
`~hr` group.
* The `~hr` and `~tech` groups owners and members are also owners and members of the `~team` group,
so the `~team` group has Alice, Bob and Catherine as owners and has everyone except Fred and Gloria
as members.
* Fred and Gloria have membership in `~tech-mobile_app` and `~tech-website` respectively, these are
the only channels they are authorized to join, or even know about.
* The chat `~team-managers_only` has as special status, all *owners* of `~team`
(Alice, Bob and Catherine) are owners of `~team-managers_only` but members of `~team` are not allowed
to join.
* `~hr-for_managers` is a special type of group owned by the *owners* of `~hr`. The *owners* of `~team`
(i.e. managers) are allowed to join `~hr-for_managers` but in the channel `~hr-for_managers` they do not
have *owner* status.
  * **Note:** Because the line between `~hr` and `~hr-for_managers` is pink, Catherine's assistant Dave
    does not see what happens in `~hr-for_managers`.
  * **Note 2:** Because owners of `~founders` are *owners* of `~hr`, Alice and Bob are also owners of
    `~hr-for_managers`.
* The `~fun` channel is a sort of free-for-all, with all *members* of `~team` being *owners* of `~fun`.
* The last type if connection used in the `~golf_with_bob` channel. Bob is the *owner* of the
`~golf_with_bob` channel and uses it to coordinate with members of the team who like to go golfing,
everybody in the `~team` channel are welcome to join but the owners of `~team` are not automatically
owners of `~golf_with_bob`.

### Caviats
You can't create a group which includes itself. While this might seem obvious, the potential for long
chains of inclusions into groups makes it rather likely to end up wanting to include a group into
another group which transitively includes the first. Groupee will refuse to let you do that and the
only solution is to use `!info` and `!allusers` to understand and then untangle the mess you have made.

## Admin
Groupee does not need to run on the same server as the mattermost instance, but it does need a full
account, it doesn't work with a simple bot token. To set it up:

1. Create a user for the bot
2. Edit copy `config.example.js` to `config.js` and edit the config appropriately
3. Run `node groupee.js`
4. Send a private message with `!help` to groupee to see if it's up and running properly.

Groupee can run fine as an ordinary user, but if a user removes groupee from a channel, it will not be
able to get back in unless you make groupee a system administrator in your mattermost system admin
control panel.

Groupee stores their database as a simple json file which is written every update, however it also
uses append-only-logs to log every database update that occurs so you can recreate the database at
a specific time in the past by playing the logs through `log2db.js`. However, you must start from
the first logs that were ever created.

```bash
cat ./eventlog-2020-06-16.ndjson ./eventlog-2020-06-17.ndjson | node ./log2db.js > ./newdb.json
```

You can also convert a db file into a simple log which would result in the same db using `db2log.js`.
This script reads the file `db.json` and outputs a log which if played through `log2db.js` would
result in the same `db.json` file. This can be useful for compacting large history of logs but still
having the ability to rollback time in case of damage to the bot's database (e.g. `!del` rampage).