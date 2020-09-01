// if(command === 'start' && !gameVars.started) {
//
// }
// //Elapse signUp's timer
// if(command === 'ready' && message.author.id === czar.id) {
//
// }
// //Let's players Join Late
// if(command === 'join' && playerList.length < 24) {
//
// }
// //remove a player from the game
// if(command === 'kick') {
//
// }
// if(command === 'end' && message.author.id === czar.id) {
// 	//endGame();
// }
// //Displays available commands
// if(command === 'help') {
// 	client.commands.get('help').execute(message);
// }
// A function that reads the collected responses one at a time, waiting for user input
// async function readResponses(message) {
// 	message.react('✅').then(function() {
// 		const filter = (reaction, user) => {
// 			return ['✅'].includes(reaction.emoji.name) && user.id === czar.id || user.id === client.user.id;
// 		};
// 		//watch the embedded message to know when to append answers
// 		const wait = message.createReactionCollector(filter, { dispose: true });
// 		let i = 1;
// 		//log added users
// 		wait.on('collect', async (reaction, user) => {
// 			if(user.id !== client.user.id && user.id === czar.id) {
// 				//append response
// 				game.currentRound.answerPost.addField(responses[i].emoji, `${responses[i].content}`, false);
// 				i++;
// 				//reset ready reaction
// 				const userReactions = message.reactions.cache.filter(readyReaction => readyReaction.users.cache.has(czar.id));
// 				try {
// 					for (const removingReaction of userReactions.values()) {
// 						await removingReaction.users.remove(czar.id);
// 					}
// 				}
// 				catch (error) {
// 					console.error('Failed to remove reactions.');
// 				}
// 				//apply appended response
// 				message.edit(responseMessage).then(async function() {
// 					//if all answers have been displayed, start the voting
// 					if (i >= responses.length) {
// 						//wait for proceed reactions to be cleared
// 						await message.reactions.removeAll().catch(error => console.error('Failed to clear reactions: ', error));
// 						//add all response emojis in order of appearance
// 						const emojiList = responses.map(response => response.emoji);
// 						for (const emoji of emojiList) {
// 							try{
// 								await message.react(`${emoji}`);
// 							}
// 							catch (e) {
// 								console.error(e);
// 							}
// 						}
// 						//kill Listener
// 						wait.stop();
// 						CountScores(message).catch(err => console.error(err));
// 					}
// 				});
// 			}
// 		});
// 	});
// }

// function KickUser(message, userID) {
// 	const toKick = client.users.cache.get(`${userID}`);
// 	message.channel.send(`${message.author} wants to kick ${toKick} those in favour, react with \ud83d\ude4b`).then(async sentMessage => {
// 		await sentMessage.react('\ud83d\ude4b');
// 		HeadCount('\ud83d\ude4b', sentMessage).then(collected => {
// 			if(Math.floor(playerList.length / 2) + 1 <= collected.length) {
// 				message.channel.send('majority rules in favour, kicking').catch(e => console.error(e));
// 				try {
// 					playerList.splice(playerList.indexOf(player => player.id === userID), 1);
// 				}
// 				catch (e) {
// 					console.error(e);
// 				}
// 			}
// 			else {
// 				message.channel.send('majority rules in favour, kicking').catch(e => console.error(e));
// 			}
// 		});
// 	});
// }
//
// function BeginRound() {
// 	//get a random prompt ID that hasn't been used yet
// 	const promptID = GetRand(prompts, prevPrompts);
// 	gameVars.currentPrompt = prompts[promptID].Prompt;
// 	//Create a DM to all current players
// 	playerList.forEach(user => client.users.cache.get(`${user.id}`).createDM());
// 	playerList.forEach(user => client.users.cache.get(`${user.id}`).send(`${gameVars.currentPrompt}`));
// 	gameVars.activeChannel.send(`Your Next prompt is:  **${gameVars.currentPrompt}**`);
// 	//Enable DM handler
// 	gameVars.roundStarted = true;
// }
//
// async function CountScores(answerPost) {
// 	//signify users can vote
// 	await answerPost.channel.send('begin voting!');
// 	voted = [];
//
// 	//create dynamic filter
// 	const filter = (reaction, user) => {
// 		if(voted.findIndex(voter => voter === user.id) === -1) {
// 			//once a user has voted push their id to the filtered list
// 			voted.push(user.id);
// 			//ensure bot isn't registering own votes
// 			return user.id !== client.user.id;
// 		}
// 		else {
// 			return false;
// 		}
// 	};
//
// 	//listen to reaction votes.
// 	const voting = answerPost.createReactionCollector(filter, { time: 15000 });
// 	//Export player list when finished/ready
// 	voting.on('end', async collected => {
// 		//collect votes into an array
// 		const votes = collected.array();
// 		if(votes.length === 0) {
// 			return;
// 		}
// 		//Find the max reaction (vote) count
// 		const winningJoke = votes.reduce((prev, current) => (prev.count > current.count) ? prev : current);
// 		//See if there is a tie
// 		const matching = votes.filter(vote => vote.count === winningJoke.count);
// 		if(matching.length === 1) {
// 			try{
// 				//If one response wins find the winning response
// 				const WinningResponse = responses[responses.findIndex(response=> response.emoji === winningJoke.emoji.name)];
// 				//If the response is found, give the player a point
// 				const winnerIndex = playerList.findIndex(player => player.id === WinningResponse.authorId);
// 				playerList[winnerIndex].score += 1;
// 				czar = client.users.cache.get(`${playerList[winnerIndex].id}`);
// 				gameVars.activeChannel.send(`the winner with ${winningJoke.count - 1} votes is... ${czar}, their current score is: ${playerList[winnerIndex].score}!`);
// 				console.log(`${czar.tag} gained a point, giving them ${playerList[winnerIndex].score}`);
// 			}
// 			catch (e) {
// 				console.log(e);
// 			}
// 		}
// 		else {
// 			try{
// 				//if there are multiple responses store them
// 				const winningResponses = [];
// 				const coWinners = [];
// 				matching.forEach(coWinner => winningResponses.push(responses[responses.findIndex(response => response.emoji === coWinner.emoji.name)]));
// 				//award each winning player a point
// 				winningResponses.forEach(response => {
// 					const winnerInd = playerList.findIndex(player => player.id === response.authorId);
// 					playerList[winnerInd].score += 1;
// 					coWinners.push(playerList[winnerInd]);
// 				});
// 				gameVars.activeChannel.send('The winners of this round are...');
// 				for (const coWinner of coWinners) {
// 					gameVars.activeChannel.send(`${client.users.cache.get(coWinner.id)} with a score of ${coWinner.score}`);
// 				}
// 				czar = client.users.cache.get(`${coWinners[0].id}`);
// 			}
// 			catch (e) {
// 				console.log(e);
// 			}
// 		}
// 		const victors = playerList.filter(player => player.score >= 10);
// 		if (victors.length !== 0) {
// 			endGame();
// 		}
// 		responses = [];
// 		await gameVars.activeChannel.send('starting a new round, keep an eye on those DMs');
// 		await Sleep(5000);
// 		return BeginRound();
// 	});
// }
//
// function endGame() {
// 	//Find the max reaction (vote) count
// 	const winner = playerList.reduce((prev, current) => (prev.score > current.score) ? prev : current);
// 	//See if there is a tie
// 	const matching = playerList.filter(player => player.score === winner.score);
// 	if(matching.length === 1) {
// 		gameVars.activeChannel.send(`Congratulations! ${client.users.cache.get(matching[0].id)} has proven they are the funniest!`);
// 		gameVars.started = false;
// 	}
// 	if(matching.length > 1) {
// 		for (const coWinner of matching) {
// 			gameVars.activeChannel.send(`${client.users.cache.get(coWinner.id)} have proven they are joint funniest!`);
// 		}
// 		gameVars.activeChannel.send(`each with a score of ${matching[0].score}`).catch(err => console.error(err));
// 		gameVars.started = false;
// 	}
// }