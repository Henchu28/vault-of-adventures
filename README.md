# vault-of-adventures

I want a page to access a database in a server with information about a DnD Campaign. For entering the web, you need to log in first and depending on the person you are (player or admin), you get to see some things or not. 
When registering on the app,  there should be an option to choose between a role: Máster or Player.
These are the pages the web should have at least:
- A Home page with a brief explanation on the app and the DnD main players + Máster (with photos of them). Both roles can see this page.
- A Characters page, where you can get all the info about a character. Add a search function to this page with filters and a sorter. Have the display of the characters like cards you can select to expand the info on them. Add two separate groups of them: DnD characters and NPCs. Both roles can see this page, but the Máster role has an extra option to delete, insert or edit characters.
- A Campaigns page, where you can see all the info about the campaings we are doing/have done. Have the display of the campaigns like cards you can select to expand the info on them. Both roles can see this page, but the Máster role has an extra option to delete, insert or edit campaigns.
- A Maps page, where we can store maps of the places we visit and descriptions of them. Have the display of the maps like cards you can select to expand the info on them. Both roles can see this page, but the Máster role has an extra option to delete, insert or edit maps.
- A Music page, where we can store and play from music for the campaings. Add an an option to delete or insert songs. Both roles can see this page.
- A Notes page, where the Máster can organize all the info he has for the DnD game. Make it like a file explorer, with interactive folders and the files are organized also in cards you can select to expand and edit. ONLY the Máster role has access to this page

To access the pages, have a select menu at the top of the web

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://vault-of-adventures.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/a1859039-2e61-4db3-bdc6-15c8ed93042b).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
