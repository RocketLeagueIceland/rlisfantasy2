We are going to create a fantasy league for RLIS, which is the icelandic league for Rocket League. We have already create a version for season 10, but the rules werent really good enough, so I wanted to create a new version from scratch.

You can find the current version on rocketleague.is for reference.

In this new version I need the following use cases.

1. people should be able to sign up/login using discord or google.
2. There should be an admin role that I want to be able to manually add to people who have signed up.
3. a user should be able to create one Fantasy team. They should be able to give the team some name. After creating a team, they should get a budget of 10.000.000 ISK. With that budget they should be able to buy up to 6 players. The users budget only matters at purchase time, and when you sell a player, you sell him for the amount you bought him at. You have three active players and three non active players. The active players then have one of three roles. Striker, Midfield and Goalkeeper. These roles affect the points they receive for ingame stats. A team can only have one Striker, one Midfielder and one Goalkeeper, you cant have two players selected for the same role. The non active players are ordered 1, 2 or 3. The non active players are used to replace the active players if they are not playing that week, and the order is used to choose who is used to decide what non active player to start replacing with. Every week each team plays one series which is a best of 5. That means there are 3 - 5 games each week. We want the average score, and not the total score to balance that out. 
4. Users get points for there players performance each week.
Goal: 50 points
Assist: 35 points
Save: 25 points
Shot: 15 points
Getting Demoed: -15 points
The Striker role means Goals are worth 100 points for that player. Midfield role means assist is worth 70 points. Goalkeeper role means saves are worth 50 points.
5. Transfer window: After each week a player can sell and buy one player, but he can never have more then 6 players total. But the transfer window should be closed an hour before the first broadcast of the week begins and opens again the day after, which would then be a new week. The transfer window automatically closes, but it is manually opened by an admin user.
6. There should be a public scoreboard available for everybody to see how the users are doing. Each users profile should be public where people can see their current player setup, and also the points history they have gotten for each week with a breakdown.
7. RLIS upload the replays to ballchasing, and I want the admins to be able to paste a link in for a certain week to collect the stats for the players, and then it should automatically also give points to all the fantasy teams. In cases where ballchasing is down, the admins are supposed to be able to add the stats manually as well. Before the weeks score is published, admins should be able to go over the scores given and breakdown, just to make sure all calculations are correct.
8. Admins should be able to add Rocket league players and a price for them. Each rocket league player belongs to one of 6 teams. We can represent the players with the team logo
9. Admins should be able to change the price of the players after each week while the transfer window is closed.
10. There should be a info page explaining the rules and everything for your users. On the frontpage, I think we can show the rules until we get scores from the first week, then on the frontpage we should just show the scoreboard.
11. People should be able to create teams at any point, even thouth the week is over, but it should not give them points for weeks that have already finished.

Just to clarify, all fantasy teams can have the same player on the team. That is totally fine.

An example of substitues:
If a player doesn't play one or more matches that their team plays, then the substitutes' matches are used to make up for those missed matches. First, Substitute 1's matches are used to make up for the matches the player missed. If Substitute 1 hasn't played enough matches to cover them, then Substitute 2's matches are used. If those aren't enough either, then Substitute 3's matches are used. The substitutes receive the position of the player they are filling in for.
NOTE: First, all matches that Player 1 misses are filled before attempting to fill matches that Player 2 misses. Likewise, all of Player 2's matches are filled before attempting to fill matches that Player 3 misses.
Substitutes gain the same double bonus as the active player they are filling in for. If the active players play all their matches, then the substitutes give no points.

There is an image of a rocket league field already in the current folder called `field.jpeg`. I think it would be cool to use that one, but rotate it 180°. Then the Striker should be placed at the top, midfield at the middle and goalkeeper at the bottom. Then we can have a bench to the right of the field with our substitutes.

I also have three images I think we should use for striker, midfield and goalkeeper. They are called `striker.png` `midfield.png` and `goalkeeper.png`

You can use any UI Library you want to make the website look cool. This is for gamers who play rocket league, so keep that in mind. It should mainly be a darkmode site using `#222222` as the main color, but the theme colors of RLIS is also `#1C2E4A` and `#7A1712`, so use those for certain accents.

I have a main logo ready in the folder called `rlis_logo.png`

We have six teams and their team logos are in the folder `Teams`

- 354 Esports (354esports.png)
- Dusty (dusty.png)
- Hamar (hamar.png)
- Omon (omon.png)
- Þór (thor.png)
- Stjarnan (stjarnan.png)

I plan on using vercel to deploy this, so any tech stack for that is fine. Nextjs or tanstack, although Im not sure if tanstack makes sense since I have never tried it before. But I know I want a fullstack framework that works with vercel for deployment. I am also fine with using Supabase for the database.

The site needs to be responsive.