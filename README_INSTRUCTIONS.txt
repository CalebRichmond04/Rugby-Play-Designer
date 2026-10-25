GPT CHAT LINK: https://chatgpt.com/share/6ade44fc-a6c0-83ea-ad2c-5b09b1265efa


Easiest way to access project (FIGMA)
FIGMA LINK:https://www.figma.com/make/44IDy7W18WQKUZRvFlBSJS/Recreate-Rugby-Play-Designer?t=BQu4HbnsFEgTCXcI-1







BELOW IS HOW TO RUN THIS ON VISUAL STUDIO CODE


RUGBY PLAY DESIGNER
Milestone 1 — Installation and Run Instructions
================================================

OVERVIEW
--------
This project is a React and TypeScript application built with Vite. These instructions explain how to install and run it using Visual Studio Code on Windows.

REQUIREMENTS
------------
1. Windows 10 or Windows 11.
2. Visual Studio Code: https://code.visualstudio.com/
3. Node.js version 22.12 or newer: https://nodejs.org/
4. An internet connection to install project dependencies.

STEP 1 — INSTALL THE REQUIRED SOFTWARE
---------------------------------------
1. Install Visual Studio Code if it is not already installed.
2. Install Node.js from https://nodejs.org/. Choose the LTS version.
3. Close and reopen Visual Studio Code after installing Node.js.

STEP 2 — OPEN THE PROJECT
-------------------------
1. Extract the provided project ZIP file to a folder on your computer.
2. Open Visual Studio Code.
3. Select File > Open Folder.
4. Select the extracted project folder containing package.json.
5. Click Select Folder.

Make sure package.json is visible in the Explorer panel on the left.

STEP 3 — OPEN THE TERMINAL
--------------------------
1. In Visual Studio Code, select Terminal > New Terminal.
2. The terminal should open at the bottom of the window.
3. Make sure the terminal is in the project folder containing package.json.

STEP 4 — CHECK NODE.JS AND NPM
------------------------------
In the VS Code terminal, enter:

    node -v

Press Enter. The version should be 22.12 or newer.

Next, enter:

    npm.cmd -v

Press Enter. This should display the npm version.

If either command is not recognized, install Node.js from https://nodejs.org/, then restart VS Code and try again.

IMPORTANT: If PowerShell reports that npm.ps1 cannot be loaded because script execution is disabled, use the npm.cmd commands in these instructions. 
You do not need to change the PowerShell execution policy.

STEP 5 — INSTALL DEPENDENCIES
-----------------------------
In the VS Code terminal, enter:

    npm.cmd install

Press Enter and wait for installation to finish. This downloads the libraries required to run the application. An internet connection is required.

STEP 6 — RUN THE APPLICATION
----------------------------
In the same terminal, enter:

    npm.cmd run dev

Press Enter and wait for Vite to report that it is ready.

The terminal will display a local address. For example:

    http://localhost:8443/

Open the exact Local address shown in your terminal in a web browser.

The Rugby Play Designer should now be running locally.

IMPORTANT: Keep the VS Code terminal open while using the application. Closing or stopping the development server will stop the application.

STEP 7 — STOP THE APPLICATION
-----------------------------
When finished, click inside the VS Code terminal and press Ctrl+C.

STEP 8 — RUN THE APPLICATION AGAIN
----------------------------------
1. Open the project folder in Visual Studio Code.
2. Select Terminal > New Terminal.
3. Enter:

    npm.cmd run dev

4. Open the Local address displayed in the terminal.


TROUBLESHOOTING
---------------
Problem: PowerShell says npm.ps1 cannot be loaded.
Solution: Use npm.cmd install and npm.cmd run dev as shown above.

Problem: The browser cannot connect.
Solution: Make sure the development server is still running and open the exact Local address printed in the terminal.

Problem: The application displays a blank page.
Solution: Open the browser developer tools by pressing F12 and check the Console tab for errors.

Problem: package.json cannot be found.
Solution: In VS Code, select File > Open Folder and choose the project folder that directly contains package.json.

PROJECT FILES
-------------
Keep the entire project folder together. Do not delete package.json, the lockfile, vite.config.ts, the .figma folder, src, or public/assets.

END OF INSTRUCTIONS