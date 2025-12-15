I find it quite frustrating when I want to try out a project, only to find out it requires an obfuscated ton of setup, including setting up weird paid AWS services and pushing to remote server.
On the plus side, this project is totally free, and WILL run fine on your home computer.
On the down side, it does involve multiple steps, but each is quite small and easy, and should be easy to do if you are familiar with these tools.
If you get stuck, paste the error into AI and it should help you on to the next step.

1) Make sure you have a working Docker installation.
2) Copy .env.docker and rename it to just .env
3) Navigate to the root of the repo and run `docker compose up --build` (MySQL port is mapped to 3307 so as not to conflict if you're running your own MySQL server)

Now browse http://localhost:8000/ and check there are no errors
You should be able to browsr around the logged-out pages, eg about, help, etc.

4) Exit back to the command prompt. Confirm containers are running using: docker compose up -d

The compose has also created a superuser for the server - "admin" - "password" along with all required util users (eg SHADOW). All the pre-built users have their password set to their username - however the hash will be incorrect so in practive you'll need to edit in a pasxword in the admin panel, although in practice you won't ever really need to login as any of these users anyway.

5) Go back to the website, and create a normal user for yourself (Eg "DodgerB") using the "Register New Account" link
6) Now test your admin access; go to http://localhost:8000/admin/ and login with the superuser. Find the user you made and tick them active in the User DB. Also tick Email Confirmed in their profile.
7) Back on the website, login with your new user to check it is working.
8) Before creating a game, check the admin panel to maker sure all the util users (EG "SHADOW" through to "SHADOW_5") are there.
9) On the website, create a 2-player Cannes game. It should display in the lobby. Join the game as another user.
10) Now try opening the game of Cannes - if everything works, you've made it! :)

For subsequent starts, use

docker compose up -d

NOTE: If you see errors involving a colon : or quotes " try opening start.sh in VS code or similar and deleting and pasting back in the bottom line. 
The issue might be to do with line end characters in linux vs windows. 
Make sure your docker files have LF and not CRLF
