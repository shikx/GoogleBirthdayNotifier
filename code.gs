/* global Logger CalendarApp ScriptApp ContactsApp Utilities Calendar UrlFetchApp MailApp */

/*
 * Thanks to this script you are going to receive an email before the birthday of each of your contacts.
 * The script is easily customizable via some variables listed below.
 */

// START MANDATORY CUSTOMIZATION

// You need to personalize these values, otherwise the script won't work.

/*
 * GOOGLE EMAIL ADDRESS
 *
 * First of all specify the Gmail address of your Google Account.
 * This is needed to retrieve information about your contacts.
 */
var myGoogleEmail = 'insertyourgoogleemailhere@gmail.com';

/*
 * NOTIFICATION EMAIL ADDRESS
 *
 * Now specify to which email address the notifications should be sent.
 * This can be the same email address of the previous line or any other email address.
 */
var myEmail = 'insertyouremailhere@someemail.com';

/*
 * EMAIL SENDER NAME
 *
 * This is the name you will see as the sender of the email.
 * If you leave it blank it will default to your Google account name.
 * Note: this may not work when using a Gmail address sending emails to itself.
 */
var emailSenderName = 'Anniversary Notifications';

/*
 * ID OF THE BIRTHDAY CALENDAR
 *
 * Open up https://calendar.google.com, in the menu on the left click on the arrow next to the birthday calendar
 * and choose 'Calendar settings', finally look for a the "Calendar ID field" (it should be something similar to
 * #contacts@group.v.calendar.google.com): copy and paste it between the quotes in the next line.
 */
var calendarId = '#contacts@group.v.calendar.google.com';

/*
 * YOUR TIMEZONE
 *
 * If you need to adjust the timezone of the email notifications use this variable.
 *
 * Accepted values:
 *  GMT - examples: 'GMT-4'
 *  regional timezones: 'Europe/Berlin' (See here for a complete list: http://joda-time.sourceforge.net/timezones.html)
 */
var myTimeZone = 'Europe/Rome';

/*
 * HOUR OF THE NOTIFICATION
 *
 * Specify at which hour of the day would you like to receive the email notifications.
 * This must be a number between 0 and 23.
 */
var notificationHour = 6;

/*
 * HOW MANY DAYS BEFORE BIRTHDAY
 *
 * Here you have to decide when you want to receive the email notification.
 * Insert between the square brackets a comma-separated list of numbers, where each number
 * represents how many day before a birthday you want to be notified.
 * If you want to be notified only once then enter a single number between the brackets.
 *
 * Examples:
 *  [0] means "Notify me the day of the birthday";
 *  [0, 7] means "Notify me the day of the birthday and 7 days before";
 *  [0, 1, 7] means "Notify me the day of the birthday, the day before and 7 days before";
 *
 * Note: in any case you will receive one email per day: all the notifications will be grouped
 * together in that email.
 */
var anticipateDays = [0, 1, 7];

/*
 * LANGUAGE
 *
 * For internationalization (translation) enter the two-digit lang-code here (to add your language just fill in the
 * 'i18n' hash below and change lang here to match that).
 */
var lang = 'en';

// For places where an indent is used for display reasons (in plaintext email), this number of spaces is used.
var indentSize = 4;

// END MANDATORY CUSTOMIZATION

// START DEBUGGING OPTIONS

// When debugging is not wanted you can set this true to disable debugging calls, for a slight speedup.
var noLog = false;

// When debugging (noLog == false) and you want the logs emailed too, set this to true.
var sendLog = false;

/*
 * The test() function can be run on a specified date as if it is "today". Specify that date here in the format
 * YEAR/MONTH/DAY HOUR:MINUTE:SECOND
 * Choose a date you know should trigger a birthday notification.
 */
var fakeTestDate = '2017/02/14 06:00:00';

// END DEBUGGING OPTIONS

/*
 * There is no need to edit anything below this line.
 * The script will work if you inserted valid values up until here, however feel free to take a peek at my code ;)
 */

var version = '2.1.3';

// Merge an array at the end of an existing array.
if (typeof Array.prototype.extend === 'undefined') {
  Array.prototype.extend = function (array) {
    var i;

    for (i = 0; i < array.length; ++i) {
      this.push(array[i]);
    }
    return this;
  };
}

if (typeof String.prototype.format === 'undefined') {
  String.prototype.format = function () {
    var args;

    args = arguments;
    return this.replace(/\{(\d+)\}/g, function (match, number) {
      return typeof args[number] !== 'undefined'
        ? args[number]
        : match
      ;
    });
  };
}

var indent = Array(indentSize + 1).join(' ');

var i18n = {
  // For all languages, if a translation is not present the untranslated string
  // is returned, so just leave out translations which are the same as the English.

  // An entry for 'en' marks it as a valid lang config-option, but leave it empty
  // to just return unaltered phrases.
  'en': {},
  /*
  To add a language copy this text after the previous line and compile the translations.
  COPY FROM THE FOLLOWING LINE
  'xx': {
  'UNKNOWN': '',
    'Years of service': '',
    'Gift choice': '',
    'Anniversary': '',
    'Anniversary today': '',
    'Anniversary tomorrow': '',
    'Anniversary in {0} days': '',
    'Hey! Don\'t forget these anniversaries': '',
    'version': '',
    'by': '',
    'dd-MM-yyyy': '',
    'send email now': '',
    'Mobile phone': '',
    'Work phone': '',
    'Home phone': '',
    'Main phone': '',
    },
  COPY UNTIL THE PREVIOUS LINE
  */
};

var birthdayCalendar = CalendarApp.getCalendarById(calendarId);
var calendarTimeZone = birthdayCalendar ? birthdayCalendar.getTimeZone() : null;
var inlineImages;

// Replace a Field.Label object with its "beautified" text representation.
function beautifyLabel (label) {
  switch (label) {
    case ContactsApp.Field.MOBILE_PHONE:
      return _('Mobile phone');
    case ContactsApp.Field.WORK_PHONE:
      return _('Work phone');
    case ContactsApp.Field.HOME_PHONE:
      return _('Home phone');
    case ContactsApp.Field.MAIN_PHONE:
      return _('Main phone');
    default:
      return label;
  }
}

/*
 * Get the translation of a string.
 * If the language or the chosen string is invalid return the string itself.
 */
function _ (string) {
  return i18n[lang][string] || string;
}

function doLog (arg) {
  noLog || Logger.log(arg);
}

/*
 * Look for birthdays on a certain date.
 * If testDate is not specified Date.now() will be used.
 */
function checkBirthdays (testDate) {
  var anticipate, subjectPrefix, subjectBuilder,
    bodyPrefix, bodySuffix1, bodySuffix2, bodyBuilder, htmlBodyBuilder, now, subject, body, htmlBody;

  doLog('Starting run of Google Anniversary Notifier version ' + version + '.');
  // The script needs this value in milliseconds, but the user entered it in days.
  anticipate = anticipateDays.map(function (n) { return 1000 * 60 * 60 * 24 * n; });
  // Verify that the birthday calendar exists.
  if (!birthdayCalendar) {
    throw new Error('Birthday calendar not found! Please follow the instructions (step "Enable the calendar").');
  }

  // Start building the email notification text.
  subjectPrefix = _('Anniversary') + ': ';
  subjectBuilder = [];
  bodyPrefix = _('Hey! Don\'t forget these anniversaries') + ':';
  bodySuffix1 = _('Google Anniversary Notifier') + ' (' + _('version') + ' ' + version + ')';
  bodySuffix2 = _('by ') + 'Giorgio Bonvicini';
  // The email is built both with plain text and HTML text.
  bodyBuilder = [];
  htmlBodyBuilder = [];

  // Use the testDate if specified, otherwise use todays' date.
  now = testDate || new Date();
  doLog('Date used: ' + now);

  inlineImages = {};
  /*
   * Look for birthdays on each of the days specified by the user.
   * timeInterval represents how many milliseconds in the future to check.
   */
  anticipate.forEach(
    function (timeInterval) {
      var optionalArgs, events, anniversaries, formattedDate, whenIsIt;

      // Set the search filter to include only events happening 'timeInterval' milliseconds after now.
      optionalArgs = {
        // Filter only events happening between 'now + timeInterval'...
        timeMin: Utilities.formatDate(new Date(now.getTime() + timeInterval), calendarTimeZone, 'yyyy-MM-dd\'T\'HH:mm:ss\'Z\''),
        // ... and 'now + timeInterval + 1 sec'.
        timeMax: Utilities.formatDate(new Date(now.getTime() + timeInterval + 1000), calendarTimeZone, 'yyyy-MM-dd\'T\'HH:mm:ss\'Z\''),
        // Treat recurring (like birthdays) events as single events.
        singleEvents: true
      };
      doLog('Checking anniversaries from ' + optionalArgs.timeMin + ' to ' + optionalArgs.timeMax);

      // Get all the matching events.
      events = Calendar.Events.list(calendarId, optionalArgs).items;
      anniversaries = events.filter(function (x) { return x.gadget.preferences['goo.contactsEventType'] === 'ANNIVERSARY'; });
      doLog('Found ' + anniversaries.length + ' anniversaries in this time range.');
      // If no ANNIVERSARY event is found for this particular timeInterval skip it.
      if (anniversaries.length < 1) {
        return;
      }

      formattedDate = Utilities.formatDate(new Date(now.getTime() + timeInterval), calendarTimeZone, _('dd-MM-yyyy'));
      // Build the headers of birthday grouping by date.
      bodyBuilder.push(' * ');
      htmlBodyBuilder.push('<dt style="margin-left:0.8em;font-style:italic">');
      switch (timeInterval / (24 * 60 * 60 * 1000)) {
        case 0:
          whenIsIt = _('Anniversary today') + ' (' + formattedDate + ')';
          break;
        case 1:
          whenIsIt = _('Anniversary tomorrow') + ' (' + formattedDate + ')';
          break;
        default:
          whenIsIt = _('Anniversary in {0} days').format(timeInterval / (24 * 60 * 60 * 1000)) + ' (' + formattedDate + ')';
      }
      bodyBuilder.push(whenIsIt, ':\n');
      htmlBodyBuilder.push(whenIsIt, '</dt><dd style="margin-left:0.4em;padding-left:0"><ul style="list-style:none;margin-left:0;padding-left:0;">');

      // Add each of the anniversaries for this timeInterval.
      anniversaries.forEach(
        function (event, i) {
          var contact;

          doLog('Contact #' + i);
          contact = new Contact(event);
          subjectBuilder.push(contact.fullName);
          bodyBuilder.extend(contact.getPlainTextLine());
          htmlBodyBuilder.extend(contact.getHtmlLine());
        }
      );

      bodyBuilder.push('\n');
      htmlBodyBuilder.push('</ul></dd>');
    }
  );

  // If there is an email to send...
  if (bodyBuilder.length > 0) {
    subject = subjectPrefix + subjectBuilder.join(' - ');
    body = [bodyPrefix, '\n\n']
           .concat(bodyBuilder)
           .concat(['\n\n', indent, bodySuffix1, '\n', indent, bodySuffix2, '\n'])
           .join('');
    htmlBody = ['<h3>', bodyPrefix, '</h3><dl>']
               .concat(htmlBodyBuilder)
               .concat(['</dl><hr/><p style="text-align:center;font-size:smaller"><a href="https://github.com/GioBonvi/GoogleBirthdayNotifier">', bodySuffix1, '</a><br/>', bodySuffix2, '</p>'])
               .join('');

    // ...send the email notification.
    doLog('Sending email...');
    MailApp.sendEmail({
      to: myEmail,
      subject: subject,
      body: body,
      htmlBody: htmlBody,
      inlineImages: inlineImages,
      name: emailSenderName
    });
    doLog('Email sent.');
  }
  // Send the log if the debug options say so.
  if (!noLog && sendLog) {
    MailApp.sendEmail({
      to: myEmail,
      subject: 'Logs for birthday-notification run',
      body: Logger.getLog(),
      name: emailSenderName
    });
  }
}

/*
 * Extract contact data from a birthday event and integrate it with additional data
 * recovered directly from Google Contact through the contactId field if present.
 */
var Contact = function (event) {
  var eventData, googleContact, currentYear, anniversaryYear, phoneFields, giftChoice;

  // Extract basic data from the event description.
  eventData = event.gadget.preferences;

  this.id = (typeof eventData['goo.contactsContactId'] === 'undefined') ? '' : eventData['goo.contactsContactId'];
  this.fullName = (typeof eventData['goo.contactsFullName'] === 'undefined') ? '' : eventData['goo.contactsFullName'];
  this.email = (typeof eventData['goo.contactsEmail'] === 'undefined') ? '' : eventData['goo.contactsEmail'];
  this.photo = (typeof eventData['goo.contactsPhotoUrl'] === 'undefined') ? '' : eventData['goo.contactsPhotoUrl'];
  this.yearsOfService = '';
  this.phoneFields = [];
  this.nickname = '';
  this.giftChoice = '';

  if (this.email !== '') {
    doLog('Has email.');
  }
  if (this.fullName !== '') {
    doLog('Has full name');
  }
  if (this.photo !== '') {
    doLog('Has photo.');
  }
  // If the contact has a contactId field try to get the Google Contact corresponding to that contactId.
  if (this.id !== '') {
    googleContact = ContactsApp.getContactById('http://www.google.com/m8/feeds/contacts/' + encodeURIComponent(myGoogleEmail) + '/base/' + this.id);
  }

  // If a valid Google Contact exists extract some additional data.
  if (googleContact) {
    // Extract contact's year of service if the contact has the anniversary year.
    if (googleContact.getDates(ContactsApp.Field.ANNIVERSARY)[0]) {
      doLog('Has birthday year.');
      currentYear = Utilities.formatDate(new Date(event.start.date.replace(/-/g, '/')), calendarTimeZone, 'yyyy');
      anniversaryYear = googleContact.getDates(ContactsApp.Field.ANNIVERSARY)[0].getYear();
      this.yearsOfService = anniversaryYear !== '' ? (currentYear - anniversaryYear).toFixed(0) : '';
    }
    // Extract contact's phone numbers.
    phoneFields = googleContact.getPhones();
    if (phoneFields.length > 0) {
      this.phoneFields = phoneFields;
      doLog('Has phones.');
    }
    // Extract contact's nickname.
    this.nickname = googleContact.getNickname();
    // Extract contact's gift choice.
    giftChoice = googleContact.getCustomFields('Gift Choice');
    if (giftChoice.length > 0) {
      this.giftChoice = giftChoice[0].getValue();
    }
  }

  /*
   * Use the extracted data to build a plain line of text displaying all the
   * collected data about the contact.
   */
  this.getPlainTextLine = function () {
    var line;

    line = [];
    // Full name.
    line.push('\n', indent, this.fullName);
    // Nickname.
    if (this.nickname !== '') {
      line.push(' "', this.nickname, '"');
    }
    // Years of service.
    if (this.yearsOfService !== '') {
      line.push(' - ', _('Years of service'), ': ', this.yearsOfService);
    }
    // Gift choice.
    if (this.giftChoice !== '') {
      line.push(' - ', _('Gift choice'), ': ', this.giftChoice);
    }
    if (this.email !== '' || typeof this.phoneFields !== 'undefined') {
      line.push(' (');
      // Email address.
      if (this.email !== '') {
        line.push(this.email);
      }
      // Phone numbers.
      this.phoneFields.forEach(function (phoneField, i) {
        var label;

        if (i !== 0 || this.email !== '') {
          line.push(' - ');
        }
        label = phoneField.getLabel();
        if (label !== '') {
          line.push('[', beautifyLabel(label), '] ');
        }
        line.push(phoneField.getPhoneNumber());
      });
      line.push(')');
    }
    line.push('\n');
    return line;
  };

  /*
   * Use the extracted data to build a line of HTML text displaying all the
   * collected data about the contact.
   */
  this.getHtmlLine = function () {
    var line, imgCount;

    line = [];

    line.push('<li>');
    // Profile photo.
    if (this.photo !== '') {
      imgCount = Object.keys(inlineImages).length;
      inlineImages['contact-img-' + imgCount] = UrlFetchApp.fetch(this.photo).getBlob().setName('contact-img-' + imgCount);
      line.push('<img src="cid:contact-img-' + imgCount + '" style="height:1.4em;margin-right:0.4em" />');
    }
    // Full name.
    line.push(this.fullName);
    // Nickname.
    if (this.nickname !== '') {
      line.push(' &quot;', this.nickname, '&quot;');
    }
    // Years of service.
    if (this.yearsOfService !== '') {
      line.push(' - ', _('Years of service'), ': ', this.yearsOfService);
    }
    // Gift choice.
    if (this.giftChoice !== '') {
      line.push(' - ', _('Gift choice'), ': ', this.giftChoice);
    }
    if (this.email !== '' || typeof this.phoneFields !== 'undefined') {
      line.push(' (');
      // Email address.
      if (this.email !== '') {
        line.push(this.email);
      }
      // Phone fields.
      this.phoneFields.forEach(function (phoneField, i) {
        var label;

        if (i !== 0 || this.email !== '') {
          line.push(' - ');
        }
        label = phoneField.getLabel();
        if (label !== '') {
          line.push('[', beautifyLabel(label), '] ');
        }
        line.push('<a href="tel:', phoneField.getPhoneNumber(), '">', phoneField.getPhoneNumber(), '</a>');
      });
      line.push(')');
    }
    // Mailto link.
    if (this.email !== '') {
      line.push(' <a href="mailto:', this.email, '">', _('send email now'), '</a>');
    }

    return line;
  };
};

// Start the notification service.
function start () {
  if (notificationHour < 0 || notificationHour > 23 || parseInt(Number(notificationHour)) !== notificationHour) {
    throw new Error('Invalid parameter: notificationHour. Must be an integer between 0 and 23.');
  }
  stop();
  try {
    ScriptApp.newTrigger('normal')
    .timeBased()
    .atHour(notificationHour)
    .everyDays(1)
    .inTimezone(myTimeZone)
    .create();
  } catch (err) {
    throw new Error('Failed to start the notification service: make sure that myTimeZone is a valid value.');
  }
}

// Stop the notification service.
function stop () {
  var triggers;
  // Delete all the triggers.
  triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    ScriptApp.deleteTrigger(triggers[i]);
  }
}

// Check if notification service is running.
function status () {
  var toLog = 'Notifications are';

  if (ScriptApp.getProjectTriggers().length < 1) {
    toLog += ' not';
  }
  toLog += ' running.';
  Logger.log(toLog);
  if (!noLog && sendLog) {
    MailApp.sendEmail({
      to: myEmail,
      name: emailSenderName,
      subject: 'Status for birthday-notification',
      body: Logger.getLog()
    });
  }
}

// Normal function call (This function is called by the timed trigger).
function normal () {
  checkBirthdays();
}

/*
 * Use this function to test the script. Edit the date in the debugging
 * configuration above and click "Run"->"test" in the menu at the top
 * of the Google script interface.
 */
function test () {
  var testDate;

  testDate = new Date(fakeTestDate);
  doLog('Testing.');
  doLog('Test date: ' + testDate);
  checkBirthdays(testDate);
}
