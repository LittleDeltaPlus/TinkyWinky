//-------------- Requires ---------------
const fs = require('fs');
const { prefix, token } = require('./config.json');
const prompts = require('./prompts.json');
const validEmoji = require('./emoji.json');
const Discord = require('discord.js');
const client = new Discord.Client();

//-------------- Start-Up ---------------
client.commands = new Discord.Collection();
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));
for (const file of commandFiles) {
	const command = require(`./commands/${file}`);
	client.commands.set(command.name, command);
}

//-------------- Ready ---------------
client.once('ready', () => {
	console.log('Over the hills and far away, TellyTubbies come out to play!');
});

client.login(token);

// ------------------------------------------
//Global Variables
let qdReaction = null, playerList = [], responses = [], czar, signUpAccessor, voted, assignedEmoji = [];
const gameVars = { started: false, roundStarted: false, activeChannel: null, currentPrompt: null }, prevPrompts = [];
let responseMessage;
//listen for messages
client.on('message', async message => {

	//DM Handler
	if(message.channel.type === 'dm' && gameVars.roundStarted && !message.author.bot &&
		playerList.findIndex(player => player.id === message.author.id) !== -1) {
		handleDM(message);
	}
	//Reaction Handler
	//return if the message isn't a command
	if(qdReaction !== null && message.author.id === client.user.id) {
		await message.react(qdReaction);
		//Handle HandsUp signup
		await handleSignup(message);
		//Handle Response Readout
		await readResponses(message);
	}

	//Command Handler
	//ignore messages that dont have the prefix, or aren't from this bot
	if (!message.content.startsWith(prefix) || message.author.bot && !(message.author.id === client.user.id)) return;
	//split the message string into arguments
	const args = message.content.slice(prefix.length).split(/ +/);
	//remove the first argument (the command) and store it as a lowercase string
	const command = args.shift().toLowerCase();


	//**Commands**
	//Start Game command
	if(command === 'start' && !gameVars.started) {
		//Prep game variables
		gameVars.started = true;
		gameVars.activeChannel = message.channel;
		playerList = [];
		//enable Signup Handler
		qdReaction = client.commands.get('start').execute(message, args);
		//Note starting User (they're obviously playing)
		czar = message.author;
		console.log(`added ${czar.tag} to game list`);
		playerList.push({ id: czar.id, score: 0 });
	}
	//Elapse signUp's timer
	if(command === 'ready' && message.author.id === czar.id) {
		signUpAccessor.end();
	}
	if(command === 'help') {
		//ToDo: Create a default help embed.
	}
});

async function readResponses(message) {
	if (qdReaction === '✅') {
		qdReaction = null;
		const filter = (reaction, user) => {
			return ['✅'].includes(reaction.emoji.name) && user.id === czar.id || user.id === client.user.id;
		};

		//watch the embedded message to know when to append answers
		const wait = message.createReactionCollector(filter, { time: 150000000 });
		let i = 0;
		//log added users
		wait.on('collect', async (reaction, user) => {
			if(user.id !== client.user.id && user.id === czar.id) {
				//append response
				responseMessage.addField(responses[i].emoji, `${responses[i].content}`, false);
				i++;
				//reset ready reaction
				const userReactions = message.reactions.cache.filter(readyReaction => readyReaction.users.cache.has(czar.id));
				try {
					for (const removingReaction of userReactions.values()) {
						await removingReaction.users.remove(czar.id);
					}
				}
				catch (error) {
					console.error('Failed to remove reactions.');
				}
				//apply appended response
				message.edit(responseMessage).then(async () => {
					//if all answers have been displayed, start the voting
					if (i >= responses.length) {
						//wait for proceed reactions to be cleared
						await message.reactions.removeAll().catch(error => console.error('Failed to clear reactions: ', error));
						//add all response emojis in order of appearance
						const emojiList = responses.map(response => response.emoji);
						for (const emoji of emojiList) {
							try{
								await message.react(`${emoji}`);
							}
							catch (e) {
								console.error(e);
							}
						}
						//kill Listener
						wait.stop();
						await CountScores(message);
					}
				});
			}
		});
	}
}

async function handleDM(message) {
	//if the player is part of the game
	if(playerList.findIndex(player => player.id === message.author.id) !== -1 &&
		//and the player hasn't given a response yet
		responses.findIndex(response => response.authorId === message.author.id) === -1) {
		//add their response and assign an emoji
		responses.push({ authorId: message.author.id, content: message.content, emoji: validEmoji[get_rand(validEmoji, assignedEmoji)].Emoji });
	}
	//when all responses are received, start displaying them
	if (responses.length === playerList.length) {
		await gameVars.activeChannel.send(`all ${responses.length} received!`);
		//build the Embedded message to display the results
		responseMessage = new Discord.MessageEmbed().setTitle(`Here are your answers to "${gameVars.currentPrompt}"`);
		responseMessage.addField(responses[0].emoji, responses[0].content, false);
		//reset Emoji Catalogue
		assignedEmoji = [];
		//queue the proceed reaction
		qdReaction = '✅';
		gameVars.roundStarted = false;
		gameVars.activeChannel.send(responseMessage);
	}
}

async function handleSignup(message) {
	if (qdReaction === '\ud83d\ude4b') {
		qdReaction = null;
		//filter hands up messages
		// eslint-disable-next-line no-unused-vars
		const filter = (reaction, user) => {return reaction.emoji.name === '\ud83d\ude4b';};
		const signUp = message.createReactionCollector(filter, { time: 30000 });
		//log added users
		signUp.on('collect', (reaction, user) => {
			if(user.id !== client.user.id && user.id !== czar.id) {
				console.log(`added ${user.tag} to game list`);
				playerList.push({ id: user.id, score: 0 });
			}
		});
		//Export player list when finished/ready
		// eslint-disable-next-line no-unused-vars
		signUp.on('end', collected => {
			if (playerList.length <= 0) {
				//you can't play by yourself
				message.channel.send('Signup ended with no players, game cancelled.');
			}
			else if (playerList.length >= 24) {
				//too many players wont fit in one Embedded message
				message.channel.send('Signup ended with 24+ players, game cancelled. I\'m sorry there\'s just too many of you!');
			}
			else {
				//start game
				console.log(`game starting with: ${playerList.length} players`);
				message.channel.send(`Great! Game starting with ${playerList.length} players.`);
				BeginRound();
			}
		});
		//Allow signUp to be stopped by an external command
		signUpAccessor = {
			end: function() {
				signUp.stop();
			},
		};
	}
}

function get_rand(catalogue, previous) {
	//If all numbers have been used reset.
	if (previous.length === catalogue.length) {
		previous = [];
	}
	//Generate random number
	const rand = Math.floor((Math.random() * catalogue.length) + 1);
	//If this hasn't been used before, return it
	if(previous.findIndex(id => id === rand) === -1) {
		previous.push(rand);
		return rand;
	}
	//else generate new number
	return get_rand();
}

function BeginRound() {
	//get a random prompt ID that hasnt been used yet
	const promptID = get_rand(prompts, prevPrompts);
	gameVars.currentPrompt = prompts[promptID].Prompt;
	//Create a DM to all current players
	playerList.forEach(user => client.users.cache.get(`${user.id}`).createDM());
	playerList.forEach(user => client.users.cache.get(`${user.id}`).send(`${gameVars.currentPrompt}`));
	//Enable DM handler
	gameVars.roundStarted = true;
}

async function CountScores(answerPost) {
	//signify users can vote
	await answerPost.channel.send('begin voting!');
	voted = [];

	//create dynamic filter
	const filter = (reaction, user) => {
		if(voted.findIndex(voter => voter === user.id) === -1) {
			//once a user has voted push their id to the filtered list
			voted.push(user.id);
			//ensure bot isn't registering own votes
			return user.id !== client.user.id;
		}
		else {
			return false;
		}
	};

	//listen to reaction votes.
	const voting = answerPost.createReactionCollector(filter, { time: 15000 });
	// eslint-disable-next-line no-unused-vars,no-empty-function
	voting.on('collect', async (reaction, user) => {});
	//Export player list when finished/ready
	// eslint-disable-next-line no-mixed-spaces-and-tabs
	voting.on('end', async collected => {
		//collect votes into an array
		const votes = collected.array();
		if(votes.length === 0) {
			return;
		}
		//Find the max reaction (vote) count
		const winningJoke = votes.reduce((prev, current) => (prev.count > current.count) ? prev : current);
		//See if there is a tie
		const matching = votes.filter(vote => vote.count === winningJoke.count);
		if(matching.length === 1) {
			try{
				//If one response wins find the winning response
				const WinningResponse = responses[responses.findIndex(response=> response.emoji === winningJoke.emoji.name)];
				//If the response is found, give the player a point
				const winnerIndex = playerList.findIndex(player => player.id === WinningResponse.authorId);
				playerList[winnerIndex].score += 1;
				czar = client.users.cache.get(`${playerList[winnerIndex].id}`);
				gameVars.activeChannel.send(`the winner with ${winningJoke.count - 1} votes is... ${czar}, their current score is: ${playerList[winnerIndex].score}!`);
				console.log(`${czar.tag} gained a point, giving them ${playerList[winnerIndex].score}`);
			}
			catch (e) {
				console.log(e);
			}
		}
		else {
			try{
				//if there are multiple responses store them
				const winningResponses = [];
				const coWinners = [];
				matching.forEach(coWinner => winningResponses.push(responses[responses.findIndex(response => response.emoji === coWinner.emoji.name)]));
				//award each winning player a point
				winningResponses.forEach(response => {
					const winnerInd = playerList.findIndex(player => player.id === response.authorId);
					playerList[winnerInd].score += 1;
					coWinners.push(playerList[winnerInd]);
				});
				gameVars.activeChannel.send('The winners of this round are...');
				for (const coWinner of coWinners) {
					gameVars.activeChannel.send(`${client.users.cache.get(coWinner.id)} with a score of ${coWinner.score}`);
				}
				czar = client.users.cache.get(`${coWinners[0].id}`);
			}
			catch (e) {
				console.log(e);
			}
		}
		const victorInd = playerList.findIndex(player => player.score >= 10);
		if (victorInd !== -1) {
			gameVars.activeChannel.send(`Congratulations! ${client.users.cache.get(playerList[victorInd].id)} has proven they are the funniest!`);
			gameVars.started = false;
		}
		responses = [];
		await gameVars.activeChannel.send('starting a new round, keep an eye on those DMs');
		return BeginRound();
	});
}

//todo: Misc. Global Variables -> Game Class
//todo: Expand Valid emoji
//todo: make random last between matches
//ToDo: testing & catching