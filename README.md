# Google Anniversary Notifier

This script is an adaptation of [GioBonvi's GoogleBirthdayNotifier][Project main page].

It is licensed under the [MIT License][License file].

## How to setup

### Enable the calendar

First of all you need to enable your contacts birthday calendar in you Google
Calendar (read [this Google help page][Google setup birthday calendar]).

### Create the script

Copy the whole content of [this file][Main code file].  
Open [Google Script][Google scripts website] and login if requested, then paste
the code into the page.

### Customize the script

Now read carefully the code you've pasted. At the top of the file you will find
some lines you need to modify along with many lines of instructions. Edit the
values as explained by the instructions.  
You must adjust the values of these variables:

- `myGoogleEmail`
- `myEmail`
- `emailSenderName`
- `calendarId`
- `myTimeZone`
- `notificationHour`
- `anticipateDays`
- `lang`

Now click File->Save in the menu and enter a name for the script (it doesn't
really matter, just name it so that you'll recognize if you find it in the
future).

### Activate API for the script

Now that the script is saved in your Google Drive folder we need to activate it.
To do so click the menu "Resources" -> "Advanced Google services".  
In the popup which will open set "Google Calendar API" to "enabled" (click the
switch on its row on the right).  
Once you have done this click on the link which says "Google API Console": you
will be taken to another page. In this page search for "Google Calendar API" and
open it. Now click "Enable" at the top of the window and close this page.  
That's it for this step.

**Important note**: please double check that you have performed **both** steps
correctly as this step seems to be the cause of many reported errors.

### Grant rights to the script

We have given the script access to the resource it needs to work: now the last
step is granting it the rights to access those resources. To do so click on the
menu "Run" -> "start". You will be prompted to "Review authorizations": do it
and click "Allow".  
You might receive a first email immediately: the following ones will be sent at
the hour you specified.  
From this moment on you will always receive an email before any of your
contacts' birthday (You should have set how many hours before at the beginning).

### Bonus (Translation)

If you want to add a new translation of the notifications, open your script,
find the line `var i18n` and have a look at the structure of the translation
object and at the instructions at the end.

To add a new language:

- find the block of code which represents one existing translation and copy it,
  for example:  

  ```javascript
  'el' : {
    'UNKNOWN': 'ΑΓΝΩΣΤΟΣ',
    ...
    'send email now': 'στείλτε email τώρα',
  },
  ```

- paste it just below itself, like this:

  ```javascript
  'el' : {
    'UNKNOWN': 'ΑΓΝΩΣΤΟΣ',
    ...
    'send email now': 'στείλτε email τώρα',
  },
  'el' : {
    'UNKNOWN': 'ΑΓΝΩΣΤΟΣ',
    ...
    'send email now': 'στείλτε email τώρα',
  },
  ```

- replace the language code of your translation with your language code and
  proceed to translate every item in the list, leaving the string on the left of
  the `:` unchanged and translating the one on the right, like this:

  ```javascript
  'el' : {
    'UNKNOWN': 'ΑΓΝΩΣΤΟΣ',
    ...
    'send email now': 'στείλτε email τώρα',
  },
  'it' : {
    'UNKNOWN': 'SCONOSCIUTO',
    ...
    'send email now': 'invia email ora',
  },
  ```

### Bonus (Stop notifications)

To stop receiving these notifications simply open the script (which you'll find
[in Google Drive][Google Drive website] if you haven't moved it) and click the
menu "Run" -> "stop".

### Bonus (Test)

If you want to test the script, but in these days none of your contacts have a
birthday you can use the ```test()``` function.

To do so, open the script and edit the `fakeTestDate` variable in the debugging
configuration section. You just need to replace the example date with the date
you want to test, then click "Run" -> "test" in the menu at the top of the page.
If everything went right you should receive a birthday notification exactly like
if today was the date you set.

[Project main page]: https://github.com/GioBonvi/GoogleBirthdayNotifier
[Main code file]: code.gs
[License file]: LICENSE
[Google Scripts website]: https://script.google.com
[Google Drive website]: https://drive.google.com/drive/
[Google setup birthday calendar]: https://support.google.com/calendar/answer/6084659?hl=en