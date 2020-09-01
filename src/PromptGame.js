const Round = require('./round');
const Discord = require('discord.js');
class promptGame {
	constructor(message) {
		this.activeChannel = message.channel;
		this.czar = message.author;
		this.roundStarted = false;
		this.responses = [];
		this.prevPrompts = [];
		this.signUpAccessor = null;
		this.currentRound = null;
		this.selfDesctruct = false;

		message.reply(' wants to start a game, react to this message with a \ud83d\ude4b to be included!').then(async sentMessage => {
			return this.startGame(sentMessage);
		}).catch(err => console.error(err));
	}

	startGame(message) {
		const game = this;
		this.HandleSignup(message).then(list => {
			game.playerList = list;
			return game.BeginRound();
		}).catch(err => { console.log(err); game.selfDesctruct = true; });
	}

	addResponse(message) {
		this.currentRound.addResponse(message).then(newLength => {
			//when all responses are received, start displaying them
			if (newLength === this.playerList.length) {
				this.roundStarted = false;
				this.activeChannel.send(`all ${newLength} received!`);
				//build the Embedded message to display the results
				this.currentRound.answerPost = new Discord.MessageEmbed().setTitle(`Here are your answers to: "${this.currentRound.currentPrompt}"`);
				this.currentRound.answerPost.addField(this.currentRound.responses[0].emoji, this.currentRound.responses[0].content, false);
				this.activeChannel.send(this.currentRound.answerPost).then(() => {
					//read the rest of the responses
					return this.endRound();
				});
			}
		});
	}

	async HandleSignup(message) {
		const game = this;
		const czar = this.czar;
		return new Promise((resolve, reject) => {
			message.react('\ud83d\ude4b').then(function() {
				//filter hands up messages
				game.HeadCount('\ud83d\ude4b', message).then(collectedUsers => {
					const tempList = [];
					for(const user of collectedUsers) {
						tempList.push({ id: user.id, score: 0 });
					}
					if(tempList.findIndex(player => player.id === czar.id) === -1) {
						tempList.push({ id: czar.id, score: 0 });
					}
					if (tempList.length <= 1) {
						//you can't play by yourself
						message.channel.send('Signup ended with one player, game cancelled.').catch(err => console.error(err));
						reject();
					}
					else if (tempList.length >= 24) {
						//too many players wont fit in one Embedded message
						message.channel.send('Signup ended with 24+ players, game cancelled. I\'m sorry there\'s just too many of you!').catch(err => console.error(err));
						reject();
					}
					else {
						//start game
						console.log(`game starting with: ${tempList.length} players`);
						message.channel.send(`Great! Game starting with ${tempList.length} players.`).catch(err => console.error(err));
						resolve(tempList);
					}
				});
			});
		});
	}

	BeginRound() {
		this.currentRound = new Round(this.prevPrompts);
		//Create a DM to all current players
		this.playerList.forEach(user => Discord.client.users.fetch(`${user.id}`, true).createDM());
		this.playerList.forEach(user => Discord.client.users.fetch(`${user.id}`).send(`${this.currentRound.currentPrompt}`));
		this.activeChannel.send(`Your Next prompt is:  **${this.currentRound.currentPrompt}**`);
	}

	async endRound() {
		await this.currentRound.readResponses();
		return this.scoreRound();
	}

	KickUser(message, userID) {
		const toKick = Discord.client.users.cache.get(`${userID}`);
		message.channel.send(`${message.author} wants to kick ${toKick} those in favour, react with \ud83d\ude4b`).then(async sentMessage => {
			await sentMessage.react('\ud83d\ude4b');
			this.HeadCount('\ud83d\ude4b', sentMessage).then(collected => {
				if(Math.floor(this.playerList.length / 2) + 1 <= collected.length) {
					message.channel.send('majority rules in favour, kicking').catch(e => console.error(e));
					try {
						this.playerList.splice(this.playerList.indexOf(player => player.id === userID), 1);
					}
					catch (e) {
						console.error(e);
					}
				}
				else {
					message.channel.send('majority rules in favour, kicking').catch(e => console.error(e));
				}
			});
		});
	}

	endGame() {
		//Find the max reaction (vote) count
		const winner = this.playerList.reduce((prev, current) => (prev.score > current.score) ? prev : current);
		//See if there is a tie
		const matching = this.playerList.filter(player => player.score === winner.score);
		if(matching.length === 1) {
			this.activeChannel.send(`Congratulations! ${Discord.client.users.cache.get(matching[0].id)} has proven they are the funniest!`);
			this.started = false;
		}
		if(matching.length > 1) {
			for (const coWinner of matching) {
				this.activeChannel.send(`${Discord.client.users.cache.get(coWinner.id)} have proven they are joint funniest!`);
			}
			this.activeChannel.send(`each with a score of ${matching[0].score}`).catch(err => console.error(err));
			this.started = false;
		}
	}

	scoreRound() {
		const nextRound = this.BeginRound();
		this.currentRound.Score(this.playerList).then((winners, count) => {
			if(winners.length === 1) {
				try {
					this.playerList[winners].score += 1;
					this.czar = Discord.client.users.cache.get(`${this.playerList[winners].id}`);
					this.activeChannel.send(`the winner with ${count - 1} votes is... ${this.czar}, their current score is: ${this.playerList[winners].score}!`);
					console.log(`${this.czar.tag} gained a point, giving them ${this.playerList[winners].score}`);
				}
				catch (e) {
					console.log(e);
				}
			}
			else {
				try {
					this.activeChannel.send('The winners of this round are...');
					for (const coWinner of winners) {
						this.activeChannel.send(`${Discord.client.users.cache.get(this.playerList[coWinner].id)} with a score of ${this.playerList[coWinner].score}`);
					}
					this.czar = Discord.client.users.cache.get(`${winners[0].id}`);
				}
				catch (e) {
					console.log(e);
				}
			}
			const victors = this.playerList.filter(player => player.score >= 10);
			if (victors.length !== 0) {
				return this.endGame();
			}
			this.activeChannel.send('starting a new round, keep an eye on those DMs').then(async function() {
				await Sleep(5000);
				return nextRound;
			});
		}).catch(err => console.error(err));
	}

	HeadCount(focusedEmoji, message) {
		const game = this;
		return new Promise(function(resolve) {
			const filter = (reaction) => {return reaction.emoji.name === focusedEmoji;};
			const signUp = message.createReactionCollector(filter, { time: 30000 });
			//Allow signUp to be stopped by an external command
			game.signUpAccessor = {
				end: function() {
					signUp.stop();
				},
			};
			//Export player list when finished/ready
			signUp.on('end', collected => {
				if(collected) {
					const collectedUsers = collected.array()[0].users.cache.array();
					collectedUsers.splice(collectedUsers.findIndex(user => user.id === Discord.ClientUser.id), 1);
					resolve(collectedUsers);
				}
			});
		});
	}
}



function Sleep(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = promptGame;