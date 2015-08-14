# dtpicker

Date/time picker along lines of datetime-local implementation in Chrome (desktop)

Most date & time pickers out there seem to be heavily graphical and not
necessarily straightforward to use with a keyboard.  jQuery UI has a
good date picker, but doesn't include a time aspect to it.  I couldn't
find a quick and easy solution to use with date/time when it has to
handle things like birthdays (so paging next/prev doesn't work, neither
is it easy to have a select list of 100+ years), and time inputs.
Google Chrome had a nice implementation when using datetime-local, but
of course other browsers don't offer a good datetime-local
implementation.  So I tried to mimic the Chrome implementation in that
 - its a text box where a specified date/time format is allowed
 - has an icon/image to click to pop up a graphical calendar
 - restricts characters/inputs to the keys needed to enter the date/time
 - auto-advances between fields when appropriate (ie when hit '6' in
   month field, since there's no 6x months, go to next field)
 - highlights invalid entries and current fields in focus
 - implemented as a jQuery extension

Anyway, its a quick & dirty implementation.  Has been tried on Chrome,
Safari, IE, Firefox (relatively recent versions, not sure about older).  

Depends on jquery UI datepicker for graphical date selection (optional)
and moment.js for date/time parsing/formatting (not so optional).  

Has not been optimized, minimized, stress tested ...

