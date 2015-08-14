/*
 * dtpicker 
 * 
 * A date and time picker for a KEYBOARD based environment (ie not using
 * touch wheels/spinners/etc like on a phone).  Based on the Chrome
 * implementation of datetime-local, where the user is presented with
 * the format required in the input field and they have to type along
 * that format, and with a drop-down graphical calendar for date
 * selection.  So an empty input will default to something like:
 *    mm/dd/yyyy hh:mm aa
 * to indicate they should enter month, day, year, etc.  And only
 * numbers, etc will be allowed to move them along.  
 *
 * Uses jquery UI datepicker for calendar options, so have that defined.
 * Uses moment for date/time parsing
 *  
 */



/////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////
//
// Auxilliary functions....
//



// getCursorPosition 
// Determines where where the cursor is in an input box,
// used to identify which field to change

(function ($, undefined) {

    $.fn.getCursorPosition = function() {
        var el = $(this).get(0);
        var pos = 0;
        if('selectionStart' in el) {
            pos = el.selectionStart;
        } else if('selection' in document) {
            el.focus();
            var Sel = document.selection.createRange();
            var SelLength = document.selection.createRange().text.length;
            Sel.moveStart('character', -el.value.length);
            pos = Sel.text.length - SelLength;
        }
        return pos;
    }
})(jQuery);



// selectRange 
// Highlights/selects a range of elements in an input box
// Can also be used to set cursor position when start == end (or end == undefined)
(function ($, undefined) {
$.fn.selectRange = function(start, end) {
    if(!end) end = start; 
    return this.each(function() {
        if (this.setSelectionRange) {
            this.focus();
            this.setSelectionRange(start, end);
        } else if (this.createTextRange) {
            var range = this.createTextRange();
            range.collapse(true);
            range.moveEnd('character', end);
            range.moveStart('character', start);
            range.select();
        }
    });
}
})(jQuery);

// setCursorPosition
// Sets cursor to specified position in an input box
// Shorthand for selectRange(pos, pos)
(function ($, undefined) {
  $.fn.setCursorPosition = function(pos) {
    this.selectRange(pos);
  }
})(jQuery);










/*
 * dtpicker - call on input field to change it to a date/time picker
 * 
 * Options: 
 *  format: What format to use for date/time - uses
 *    YYYY for year
 *    MM for month
 *    DD for day of month
 *    hh for hour
 *    mm for minute
 *    ss for second
 *    aa for am/pm
 *    Can be any any combination of these with other characters between,
 *    ie  YYYY-MM-DD, or MM/DD/YYYY hh:mm, or MM/DD/YYYY hh:mm:ss aa, or ...
 *    Don't use Y,M,D,h,m,s,a in format as it might interfere with
 *    formatting and parsing addresses, but other control characters
 *    allowed (ie ':',  ' ', 'T', 'z', '-', ...)
 *    If (aa) included in format, we use 12 hr display, otherwise use 24
 *     hour formats.
 *
 *  datepickerOpts: passed to datepicker as its options
 *    if onSelect included, its not passed directly as option but it
 *    will get called after our own onSelect processing is handled
 *    You'll need to include 
 *      buttonImage: (something)
 *    in the options to set the icon, otherwise we won't use datpicker
 *    to assist in date selection.
 *    We'll also reset/override the dateFormat option to yy-mm-dd - its
 *    a hidden field, get over it - all people will see is the icon
 *  
 *  validate: function( dateComponents ) 
 *    Called on current value of field to validate - can be used to
 *    restrict date values, etc - returning false will indicate current
 *    Date is invalid and style 'dtpicker-invalid' will be applied (you
 *    can css that any way you want - ie border: 1px solid red
 *  
 * 
 * Usage: 
 *  $('.mydatetimefields').dtpicker( { 
 *                        format: 'MM/DD/YYYY hh:mm',
 *                        datpickerOpts: {
 *                          buttonImage: 'images/calendar.png',
 *                          buttonImageOnly: true,
 *                          showOn: "button",
 *                        },
 *                        function( d ) {
 *                          // not ok if date is > 2 years in past?
 *                          if( d && d.getYear() < (new Date()).getYear() - 2 ) return false;
 *                          return true;
 *                        } 
 *  });
*/






(function($, undefined){

  // jquery constructor
  $.fn.dtpicker = function(options) {
    // Combine with defaults
    var settings = $.extend({}, $.fn.dtpicker.defaults, options);
    
    // Are we using 24-hour format
    if(settings.format.indexOf('aa') >= 0) settings.use24Hour = false;
    else settings.use24Hour = true;

    // Are we using datepicker to assist in date selection
    if(settings.datepickerOpts && settings.datepickerOpts.buttonImage) settings.useDatepicker = true;
    else settings.useDatepicker = false;

    return this.each(function() {
      $.dtpicker(this, settings);
    });
  };

  $.dtpicker = function (elm, settings) {
    var e = $(elm)[0];
    // Use existing or create one
    return e.dtpicker || (e.dtpicker = new jQuery._dtpicker(e, settings));
  };


  // Initial version....
  $.dtpicker.version = '0.1';







  // Internals...
  $._dtpicker = function(elm, settings) {

    // Save element and settings
    this.elm = elm;
    this.settings = settings; 

    // Save this for callbacks
    var thisdtp = this;

    // Initialize current 
    var currentDtVal = $(elm).val();
    var currentDt;
    if(currentDtVal) {
      // Try moment with setting format and then just in general 
      currentDt = moment( currentDtVal, this.settings.format);
      if(!currentDt.isValid() ) currentDt = moment( currentDtVal );
    }
    // Initialize year, month, day, hour, minute, second, etc based on
    // current date/time in input field
    if( currentDt && currentDt.isValid() ) {
      this.year = currentDt.get('year');
      this.month = currentDt.get('month'); // off by 1 from display...
      this.day = currentDt.get('date');
      this.hour = currentDt.get('hour');
      this.minute = currentDt.get('minute');
      this.second = currentDt.get('second');
      if(this.hour > 11) this.ampm = 'PM';
      else this.ampm = 'AM';
      
      // May have read input from one format and be putting it in
      // another, so reset the elements value to a string in the desired
      // format (ie can ready input as 2015-01-01T11:19:45z but display
      // it as MM/DD/YYYY HH:MM - just trying to be flexible
      var val = this.toString();
      $(elm).val( val );
    }
    else $(elm).val( settings.format.toLowerCase() ); // when showing formats in display, use all lower case

    // need to capture focus events, key press events, and clicks (ie if cursor moved)
    // keypress returns false to preventDefault actions (so keys don't // show in input)
    $(elm).keypress( function(ev) { thisdtp.keypressHandler(ev); return false;} ); 
    $(elm).focus( function(ev) { thisdtp.focusHandler(ev) } );
    $(elm).click( function(ev) { thisdtp.clickHandler(ev) } );
    $(elm).blur( function(ev) { thisdtp.blurHandler(ev) } );


    // Create a hidden input field for the datepicker widget (if applicable)
    if( this.settings.datepickerOpts && this.settings.datepickerOpts.buttonImage ) {
      // Create hidden input and put it after this element
      var calinput = $('<input>').attr('hidden', true);
      if( elm.id ) calinput.attr('id', elm.id+'_dtpickerHiddenDate')
      this.hiddenInput = calinput;
      this.updateHiddenInput();
      $(elm).after( calinput );

      // Apply datepicker to hidden element
      // For onSelect, we process the date from the calendar widget and
      // use it here, refreshing our elements display, and then call any
      // supplied onSelect
      var oldOnSelect = this.settings.datepickerOpts.onSelect;
      this.settings.datepickerOpts.onSelect = function( d, inp ) {
        var spl = d.split('-');
        thisdtp.year = parseInt(spl[0]);
        thisdtp.month = parseInt(spl[1])-1;
        thisdtp.day = parseInt(spl[2]);
        $(this).datepicker('hide');
        thisdtp.refresh();
        if(oldOnSelect) oldOnSelect( d, inp );
      };
      this.settings.datepickerOpts.dateFormat = 'yy-mm-dd';
      calinput.datepicker( this.settings.datepickerOpts );
    } // end hidden input for datepicker
  }; // end _dtpicker




  // toString
  // Return this datetime in the supplied format - 
  // TODO just using replace here - should we use moment?  
  $._dtpicker.prototype.toString = function( fmt ) {
    if( !fmt) fmt = this.settings.format;
    var s = fmt.replace('YYYY', (this.year === undefined ? 'yyyy' : c3rxUtilities.padZeros(this.year, 4) ) )
        .replace('MM', (this.month === undefined ? 'mm' : c3rxUtilities.padZeros( this.month + 1, 2 ) ) )
        .replace('DD', (this.day === undefined ? 'dd' : c3rxUtilities.padZeros( this.day, 2 ) ) )
        .replace('hh', (this.hour === undefined ? 'hh' : c3rxUtilities.padZeros( this.settings.use24Hour ? this.hour : ( this.hour < 13 ? this.hour : this.hour-12 ), 2 ) ) )
        .replace('mm', (this.minute === undefined ? 'mm' : c3rxUtilities.padZeros( this.minute, 2 ) ) )
        .replace('ss', (this.second === undefined ? 'ss' : c3rxUtilities.padZeros( this.second, 2 ) ) )
        .replace('aa', (this.ampm === undefined ? 'aa' : this.ampm ) )
        ;
    return s;
  };
  
  // goodChars
  // When kepress on input box, if cursor is is under one of these
  // letters, it maps to a specific field type (ie month, year, etc )
  $._dtpicker.prototype.goodChars = { Y: true, M: true, D: true, h: true, m: true, a: true };

 
  // updateHiddenInput
  // Set the value of the hidden input field to the currently inputted date so
  // the calendar widget will have the correct value if displayed
  $._dtpicker.prototype.updateHiddenInput = function() {
    if( !this.hiddenInput ) return; // only if using calendar widget

    // Set it to the this date if we have all the date fields
    // Otherwise, leave it empty (will default to showing today's month)
    if( this.year === undefined || this.month === undefined || this.day === undefined ) this.hiddenInput.val('');
    else this.hiddenInput.val( this.toString('YYYY-MM-DD') )
  };

  // nextFieldPosition
  // The cursor is currently highlightin a section of the date format -
  // here we find the next field we'd advance to after this one - set
  // cursor to this value when ready to move to next field
  $._dtpicker.prototype.nextFieldPosition = function() {
    var p = this.currentPosition;
    var c = this.settings.format[p];
    while( ++p < this.settings.format.length && 
      ( (this.settings.format[p] == c) || !this.goodChars[ this.settings.format[p] ] ) ) { }
    return p;
  };

  // keyCodeToChar
  // This function identifies known keycodes so we can process them and
  // ignore all others
  // TODO might want to set this based on format
  $._dtpicker.prototype.knownKeyCodes = {
    32: ' ',
    44: '.',
    45: '-',
    46: ',',
    47: '/', 
    48: '0',
    49: '1', 
    50: '2',
    51: '3', 
    52: '4', 
    53: '5', 
    54: '6',
    55: '7',
    56: '8', 
    57: '9', 
    58: ':',
    97: 'a', 
    112:'p',
  };
  

  // advanceChars
  // When pressed, advance to next field
  // TODO Should we use the format to identify these?
  $._dtpicker.prototype.advanceChars = { 
    ' ' : true,
    '.' : true,
    '-' : true,
    ',' : true,
    '/' : true,
    ':' : true,
  };

  // keyCodeToChar 
  // Takes keyCode to our character equivalent for strings/matching
  $._dtpicker.prototype.keyCodeToChar = function( kc ) {
    return this.knownKeyCodes[ kc ];
  };

  // refresh
  // Update the value of our input field, maintaining current cursor position and highlighting
  $._dtpicker.prototype.refresh = function() {
    $(this.elm).val( this.toString() );
    $(this.elm).setCursorPosition( this.currentPosition );
    this.highlightDtSection( this.currentPosition );
    if( this.settings.validate ) {
      var ok = this.settings.validate( this.getDateComponents() );
      if( ok ) $(this.elm).removeClass('dtpicker-invalid');
      else $(this.elm).addClass('dtpicker-invalid');
    }
  };


  // getDate
  // Get the javascript Date object for our current value(s)
  // TODO does it matter if some fields undefined
  $._dtpicker.prototype.getDate = function() {
    return new Date( this.year, this.month, this.day, this.hour, this.minute, this.second );
  };
  $._dtpicker.prototype.getDateComponents = function() {
    return { year: this.year, month: this.month, day: this.day, 
    hour: this.hour, minute: this.minute, second: this.second , ampm: this.ampm };
  };


  // highlightDtSection
  // Highlights (via setSelectionRange) the part of the input field
  // that's currently being edited, based on where the cursor is
  // relative to the format
  $._dtpicker.prototype.highlightDtSection = function(p) {
    var c = this.settings.format[ p ];
    if( this.advanceChars[ c ] ) {
      p = this.nextFieldPosition(); 
      c = this.settings.format[ p ];
    }
    var p0 = p1 = p;
    while(p1 < this.settings.format.length && this.settings.format[p1] == c) p1++;
    while(p0 >= 0 && this.settings.format[p0] == c) p0--;
    p0++;
    $(this.elm).selectRange(p0, p1);
  };



  // focusHandler 
  // Find and highlight cursor position in formatted string
  // Needed when 'tab' to field
  $._dtpicker.prototype.focusHandler = function( ev ) {
    var p = $(this.elm).getCursorPosition();
    this.currentPosition = p;
    this.highlightDtSection( p );
  };


  // clickHandler 
  // Find and highlight cursor position in formatted string
  // Needed when 'click' to field
  $._dtpicker.prototype.clickHandler = function( ev ) {
    var p = $(this.elm).getCursorPosition();
    this.currentPosition = p;
    this.highlightDtSection( p );
  };

  // blur handler - call give blur fn
  $._dtpicker.prototype.blurHandler = function( ev ) {
    if( this.settings.blur ) this.settings.blur( ev ) ;
  };


  // keypress handler
  // Process keystrokes, ignoring ones we don't care about, and updating
  // fields if we do. Auto-advance to next field when typing another
  // character onto that field would make the value too big (ie keypress
  // 4 in day field, auto-advance to next field because day can never be
  // 4x.
  $._dtpicker.prototype.keypressHandler = function( ev ) {
    var thisdtp = this;
    thisdtp.currentPosition = $( ev.target ).getCursorPosition();
    thisdtp.newChar = thisdtp.keyCodeToChar( ev.keyCode );


    if( thisdtp.newChar === undefined ) { // ignorable key
      $( ev.target ).val( thisdtp.toString() );
      $( ev.target ).setCursorPosition( thisdtp.currentPosition ); 
      return;
    }

    var c = this.settings.format[ this.currentPosition ];
    var pos = this.currentPosition;
    if( !this.goodChars[c] ) { 
      pos = this.nextFieldPosition();
      c = this.settings.format[ pos ];
    }

    if( this.advanceChars[ this.newChar ] ) {
      pos = this.nextFieldPosition();
    }
    else if( c == 'Y') { // year
      if( this.newChar == '\b' ) this.year = undefined;
      else if( !$.isNumeric( this.newChar ) ) {} // skip if non-numeric 
      else if( this.year === undefined ) this.year = parseInt( this.newChar );
      else {
        var y = 10*this.year + parseInt( this.newChar );
        if(y < 3000) this.year = y;
        else this.year = parseInt( this.newChar );
        if( 10 * this.year > 3000) pos = this.nextFieldPosition();
      }
    }
    else if( c == 'M' ) { // month
      if( this.newChar == '\b' ) this.year = undefined;
      else if( !$.isNumeric( this.newChar ) ) {}  // skip if non-numeric 
      else if( this.month == undefined ) { 
        this.month = parseInt(this.newChar)-1;
        if(this.month < 0) this.month = 0;
        if( this.month > 0 ) pos = this.nextFieldPosition();
      }
      else {
        this.month = 10 * (this.month+1) + parseInt(this.newChar)-1;
        if(this.month > 11) this.month = parseInt(this.newChar)-1;
        pos = this.nextFieldPosition();
      }
    }
    else if( c == 'D' ) { // day of month
      if( this.newChar == '\b' ) this.year = undefined;
      else if( !$.isNumeric( this.newChar ) ) {}  // skip if non-numeric 
      else if( this.day === undefined )  { 
        this.day = this.newChar;
      }
      else {
        var d = 10 * this.day + parseInt( this.newChar );
        if( d <= 31 ) {
          this.day = d;
        }
        else this.day = parseInt( this.newChar );

        if(this.day*10 > 31) pos = this.nextFieldPosition();
      }
    }
    else if( c == 'h' ) { // hour
      if( !$.isNumeric( this.newChar ) ) {}  // skip if non-numeric 
      else if( this.hour === undefined ) this.hour = parseInt( this.newChar );
      else {
        var h = 10 * this.hour + parseInt( this.newChar );
        if( this.settings.use24Hour && h > 23 ) h = parseInt( this.newChar );
        else if( !this.settings.use24Hour && h > 12 ) h = parseInt( this.newChar );

        this.hour = h;
        this.ampm = ( this.hour > 11  ? 'PM' : 'AM' );
        if( !this.settings.use24Hour && this.hour > 1 ) pos = this.nextFieldPosition();
        if( this.settings.use24Hour && this.hour > 2 ) pos = this.nextFieldPosition();
      }
    }
    else if( c == 'm' ) { // minute
      if( !$.isNumeric( this.newChar ) ) { } // skip if non-numeric 
      else if( this.minute === undefined ) this.minute = parseInt( this.newChar );
      else {
        var m = 10 * this.minute + parseInt( this.newChar );
        if( m > 60 ) m = parseInt( this.newChar );
        this.minute = m;
        if( 10 * this.minute > 60) pos = this.nextFieldPosition();
      }
    }
    else if( c == 's' ) { // second 
      if( !$.isNumeric( this.newChar ) ) { } // skip if non-numeric 
      else if( this.second === undefined ) this.second = parseInt( this.newChar );
      else {
        var m = 10 * this.second + parseInt( this.newChar );
        if( m > 60 ) m = parseInt( this.newChar );
        this.second = m;
        if( 10 * this.second > 60) pos = this.nextFieldPosition();
      }
    }
    else if( c == 'a' ) { // ampm
      if( this.newChar == 'a' ) { 
        this.ampm = 'AM'; 
        if( this.hour > 12 ) this.hour -= 12;
        pos = this.nextFieldPosition(); 
      }
      else if( this.newChar == 'p' ) { 
        this.ampm = 'PM'; 
        if( this.hour < 12 ) this.hour += 12;
        pos = this.nextFieldPosition(); 
      }
      else { } // nothing
    }
    

    // Update the value, cursor position, highlighting, and hidden input field
    $(this.elm).val( this.toString() );
    $(this.elm).setCursorPosition( pos );
    this.currentPosition = pos;
    this.refresh();
    this.updateHiddenInput();
  };



  // Defaults
  $.fn.dtpicker.defaults = {
    format: 'MM/DD/YYYY hh:mm aa',
    datepickerOpts: { },
  };


})(jQuery);





