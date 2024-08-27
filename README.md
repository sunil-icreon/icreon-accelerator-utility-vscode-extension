# icreon-accelerator-utility

Extension would provide below given features:

1. Perform code auditing against below given checklist items.

   - Finding vulnerable and outdated npm packages.
   - Finding unused and duplicate code and analyze the quality of code.
   - Finding EsLint issues, licensed files and used npm packages.

2. Provide UI to write unit test cases for all the files in selected folder using ChatGPT.

   - Developer will be able to choose the model.
   - Test files will be created/updated automatically, reducing manual effort of copying the test cases.

3. Provide UI to search any prompt using ChatGPT.

   - Developer will be able to choose the model.

4. Provide UI to search for npm packages and install them from the IDE itself.

   - Developers will be able to search npm package and install them as ‘DEV' or 'PROD’ dependency, reducing the manual effort of searching & installing packages.
   - NPM package details page, along with basic details, will also provide vulnerability details against each version and feature to scan any version for vulnerabilities.
   - It will maintain search history.

5. Provide a UI with list of already defined solutions for common functionalities (like AzureAD integration in ReactJs).

   - Developer will be able to explore & integrated the solution with a single click.

6. Provide a UI displaying the current project summary with below information.
   - Tech Stack Used: Framework, language, style language, Webserver information (if available).
   - Configuration Status: ESLint, Unit tests, Content Security Policy (CSP) configurations status.
   - Scripts Added: Developer can run any script command from UI.
   - Additionally, displayed list of standard VSCode extension, that may be useful for developers. Can be installed from the UI.

<br/>

## Installation

1. Install Visual Studio Code 0.10.1 or higher.
2. Launch VS Code.
3. Launch the command palette by using Ctrl-Shift-P (Windows, Linux) or Cmd-Shift-P (OSX).
4. Type in Install Extension and select 'Extensions : Install Extensions'.
5. Type Icreon Accelerator: Utilities.
6. Choose the extension from the drop down.
7. Reload Visual Studio Code.

<br/>

## Usage

### From Context Menu

1.  Right click on <b>package-lock.json</b> file in File Explorer.
2.  Select 'Icreon Accelerator: Utilities' from the context menu.
    <br/><br/>

### For Writing Unit Test Cases

1.  Right click on <b>folder</b> in File Explorer.
2.  Select 'Icreon Accelerator: Add Unit Tests' from the context menu.
    <br/><br/>
