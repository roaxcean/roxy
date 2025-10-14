```
    ____  ____ _  ____  __
   / __ \/ __ \ |/ /\ \/ /
  / /_/ / / / /   /  \  / 
 / _, _/ /_/ /   |   / /  
/_/ |_|\____/_/|_|  /_/   
```
## *R*arely *O*obeys, e*X*tremely *Y*appy

Roxy is a barebones implementation of a discord app, meant to build apps on top of it. I still plan on expanding what it
can do, or just make it easier to work with in general...

As of now, it has a simple `/talk` command to get settled into taking input with slash commands, and a few other ones who
work with [Volt Radio](https://voltradio.lol/)'s API. (Notably: `/volt` and `/voltdata`.)

---

## How to run it yourself?

> You need to have intalled [NodeJS](https://nodejs.org/en/download) (and any other JS package manager, or use NodeJS's `npm`)

First, fill out the `.env.example` to your liking, and then rename it to `.env`.

Then, just run:
```bash
npm i
```
Then:
```bash
npm run start
```
In the root folder. And then you're good to go! Any errors or technical data will be printed to the console.