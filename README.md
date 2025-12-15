I find it quite frustrating when I want to try out a project, only to find out it requires an obfuscated ton of setup, including setting up weird paid AWS services and pushing to remote server.
On the plus side, this project is totally free, and WILL run fine on your home computer.
On the down side, it does involve multiple steps, but each is quite small and easy, and should be easy to do if you are familiar with these tools.
If you get stuck, paste the error into AI and it should help you on to the next step.

1) Make sure you have a working Docker installation.
2) Navigate to the root of the repo and run `docker compose up --build`

Now browse http://localhost:8000/ and check there are no errors
You should be able to browsr around the logged-out pages, eg about, help, etc.

3) Create superuser: python manage.py createsuperuser (use "admin" for the superuser)
4) Restart the server, and create a normal user (Eg "Joey") using the "Register New Account" link
5) Now test your admin access; go to http://localhost:8000/admin/ and login with your superuser. Find the user Joey and tick them active in the User DB. Also tick Email Confirmed in their profile.
6) Back on the website, login with Joey to check it is working.
7) Before creating a game, user the admin panel to create users "SHADOW" through to "SHADOW_5"
8) On the website, create a 2-player Cannes game. It should display in the lobby. Join the game as another user.
9) Now try opening the game of Cannes - if everything works, you've made it! :)

