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


    // Public methods
    this.getMoment = function() {
      return $.dtpicker( this ).getMoment();
    };
    this.getDate = function() {
      return $.dtpicker( this ).getDate();
    };
    this.getDateComponents = function() {
      return $.dtpicker( this ).getDateComponents();
    };
    this.setMoment = function(d) {
      return $.dtpicker( this ).setMoment(d);
    };
    this.setDate = function(d) {
      return $.dtpicker( this ).setDate(d);
    };
    this.hideDt = function( d ) {
      return $.dtpicker( this ).hideDtSection();
    };
    this.showDt = function( d ) {
      return $.dtpicker( this ).showDtSection();
    };

    return this.each(function() {
      $.dtpicker(this, settings);
    });
  };


  $.dtpicker = function (elm, settings) {
    var e = $(elm)[0];
    // Use existing or create one
    return e.dtpicker || (e.dtpicker = new jQuery._dtpicker(e, settings));
  };


  // Internals...
  $._dtpicker = function(elm, settings) {

    // Save element and settings
    this.elm = elm;
    this.settings = settings; 
    this.datepickerOpts = $.extend({}, this.settings.datepickerOpts );

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

    this.setMoment( currentDt );
    
    // true if haven't entered character in field yet
    this.currentChars = "";

    // each field true if we use/require them in the format
    this.requiredFields = { };
    this.requiredFields.year = ( this.settings.format.indexOf('YY') >= 0 ? true : false );
    this.requiredFields.month = ( this.settings.format.indexOf('MM') >= 0 ? true : false );
    this.requiredFields.day = ( this.settings.format.indexOf('DD') >= 0 ? true : false );
    this.requiredFields.hour = ( this.settings.format.indexOf('hh') >= 0 ? true : false );
    this.requiredFields.minute = ( this.settings.format.indexOf('mm') >= 0 ? true : false );
    this.requiredFields.second = ( this.settings.format.indexOf('ss') >= 0 ? true : false );
    this.requiredFields.ampm = ( this.settings.format.indexOf('aa') >= 0 ? true : false );

    // need to capture focus events, key press events, and clicks (ie if cursor moved)
    // keypress returns false to preventDefault actions (so keys don't // show in input)
    $(elm).keypress( function(ev) { thisdtp.keypressHandler(ev); return false;} ); 
    $(elm).keydown( function(ev) { thisdtp.keydownHandler(ev); } );
    $(elm).focus( function(ev) { thisdtp.focusHandler(ev) } );
    $(elm).click( function(ev) { thisdtp.clickHandler(ev) } );
    $(elm).blur( function(ev) { thisdtp.blurHandler(ev) } );


    // Create a hidden input field for the datepicker widget (if applicable)
    if( this.datepickerOpts && this.datepickerOpts.buttonImage ) {
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
      var oldOnSelect = this.datepickerOpts.onSelect;
      this.datepickerOpts.onSelect = function( d, inp ) {
        var spl = d.split('-');
        thisdtp.year = parseInt(spl[0]);
        thisdtp.month = parseInt(spl[1])-1;
        thisdtp.day = parseInt(spl[2]);
        $(this).datepicker('hide');
        thisdtp.refresh();
        if(oldOnSelect) oldOnSelect( d, inp );
      };
      this.datepickerOpts.dateFormat = 'yy-mm-dd';
      calinput.datepicker( this.datepickerOpts );
    } // end hidden input for datepicker
  }; // end _dtpicker




  // toString
  // Return this datetime in the supplied format - 
  // TODO just using replace here - should we use moment?  
  $._dtpicker.prototype.toString = function( fmt ) {
    if( !fmt) fmt = this.settings.format;
    var s = fmt.replace('YYYY', (this.year === undefined ? 'yyyy' : this.padZeros(this.year, 4) ) )
        .replace('DD', (this.day === undefined ? 'dd' : this.padZeros( this.day, 2 ) ) )
        .replace('hh', (this.hour === undefined ? 'hh' : this.padZeros( this.settings.use24Hour ? this.hour : ( this.hour < 13 ? this.hour : ((this.hour%12) || 12) ), 2 ) ) )
        .replace('mm', (this.minute === undefined ? 'mm' : this.padZeros( this.minute, 2 ) ) )
        .replace('ss', (this.second === undefined ? 'ss' : this.padZeros( this.second, 2 ) ) )
        .replace('aa', (this.ampm === undefined ? 'aa' : this.ampm ) )
        .replace('MM', (this.month === undefined ? 'mm' : this.padZeros( this.month + 1, 2 ) ) ) // do this after minutes because of mm
        ;
    return s;
  };
  
  // goodChars
  // When kepress on input box, if cursor is is under one of these
  // letters, it maps to a specific field type (ie month, year, etc )
  $._dtpicker.prototype.goodChars = { Y: true, M: true, D: true, h: true, m: true, a: true };



  // Want to pad numbers so can do dates like 05/02/2015
  $._dtpicker.prototype.padZeros = function(n, len) {
    var s = n.toString();
    if (s.length < len) { s = ('0000000000' + s).slice(-len); } // need enough zeros
    return s;
  };


 
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


  $._dtpicker.prototype.shouldAdvance = function( c ) { 
    if( c == 'Y' ) {
      this.year = parseInt( this.currentChars.slice( -4 ) );
      if( this.currentChars.length >= 4 ) return true;
      return false;
    }
    else if( c == 'M' ) {
      this.month = ( parseInt( this.currentChars.slice( -2 ) ) - 1) % 12; // make 0-11
      if( this.month > 0 && this.month < 12 ) return true;
      else if( this.month == 0 && this.currentChars.length >= 2 ) return true;
      return false;
    }
    else if( c == 'D' ) {
      this.day = parseInt( this.currentChars.slice( -2 ) ); // let moment take care of dates > 31
      if( this.day > 3 && this.day < 32 ) return true;
      else if( this.day > 0 && this.day < 4 && this.currentChars.length >= 2 ) return true;
      return false;
    }
    else if( c == 'h' ) {
      this.hour = parseInt( this.currentChars.slice( -2 ) );
      if( this.settings.format.use24Hour ) {
        this.hour = this.hour % 24;
        if( this.hour > 11 ) this.ampm = 'PM';
        else this.ampm = 'AM';
        if( this.hour > 2  && this.hour < 24 ) return true;
        else if( this.hour > 0 && this.hour < 3 && this.currentChars.length >= 2 ) return true;
      }
      else {
        this.hour = this.hour % 12;
        if( this.hour > 1  && this.hour < 13 ) { 
          if( this.ampm == 'PM' && this.hour < 12 ) this.hour += 12;
          return true;
        }
        else if( this.hour == 1 && this.currentChars.length >= 2 ) {
          if( this.ampm == 'PM' ) this.hour = 13;
          return true;
        }
      }
      return false;
    }
    else if( c == 'm' ) {
      this.minute  = parseInt( this.currentChars.slice( -2 ) );
      if( this.minute > 5 && this.minute < 60 ) return true;
      else if ( this.minute >= 0 && this.minute < 6 && this.currentChars.length >=2 ) return true;

      return false;
    }
    else if( c == 's' ) {
      this.second = parseInt( this.currentChars.slice( -2 ) );
      if( this.second > 5 && this.second < 60 ) return true;
      else if ( this.second >= 0 && this.second < 6 && this.currentChars.length >=2 ) return true;

      return false;
    }
    else if( c == 'a' ) {
      var val = this.newChar;
      if( val == 'a' ) {
        this.ampm = 'AM';
        return true;
      }
      else if( val == 'p' ) {
        this.ampm = 'PM';
        if( this.hour ) this.hour += 12;
        return true;
      }
      return false;
    }
    
    console.error('Unexpected format character:' + c );
    return false;
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
    var m = this.getMoment();
    var ok = ( m ? m.isValid() : false );
    if( this.settings.validate ) {
      ok = ok && this.settings.validate( this.getDateComponents() );
    }
    if( ok ) $(this.elm).removeClass('dtpicker-invalid');
    else $(this.elm).addClass('dtpicker-invalid');
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
  $._dtpicker.prototype.getMoment = function() {
    if( ( this.year === undefined && this.requiredFields.year ) ||
        ( this.month === undefined && this.requiredFields.month ) ||
        ( this.day === undefined && this.requiredFields.day ) ||
        ( this.hour === undefined && this.requiredFields.hour ) ||
        ( this.minute === undefined && this.requiredFields.minute ) ||
        ( this.second === undefined && this.requiredFields.second ) ||
        ( this.ampm === undefined && this.requiredFields.ampm ) ) return null; // invalid

    return moment( this.getDateComponents() );
  };


  
  // setDate
  // Set the date/time from javascript Date object
  $._dtpicker.prototype.setDate = function( d ) {
    return this.setMoment( moment( d ) ) ;
  }
  $._dtpicker.prototype.setMoment = function( d ) {
    
    // Initialize year, month, day, hour, minute, second, etc 
    if( d && d.isValid() ) {
      this.year = d.get('year');
      this.month = d.get('month'); // off by 1 from display...
      this.day = d.get('date');
      this.hour = d.get('hour');
      this.minute = d.get('minute');
      this.second = d.get('second');
      if(this.hour > 11) this.ampm = 'PM';
      else this.ampm = 'AM';
      
      // May have read input from one format and be putting it in
      // another, so reset the elements value to a string in the desired
      // format (ie can ready input as 2015-01-01T11:19:45z but display
      // it as MM/DD/YYYY HH:MM - just trying to be flexible
      var val = this.toString();
      $(this.elm).val( val );
    }
    else {
      this.year = this.month = this.day = this.hour = this.minute = this.second = this.ampm = undefined;
      $(this.elm).val( this.settings.format.toLowerCase() ); // when showing formats in display, use all lower case
    }
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


  // hideDtSection
  // Hide input and any other fields
  $._dtpicker.prototype.hideDtSection = function() {
    $(this.elm).hide();
    $('~img:first', this.elm).hide();
  };


  // showDtSection
  // Show input and any other fields
  $._dtpicker.prototype.showDtSection = function() {
    $(this.elm).show();
    $('~img:first', this.elm).show();
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
    this.currentChars = "";
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
    thisdtp.newChar = thisdtp.keyCodeToChar( ev.keyCode ? ev.keyCode : ev.charCode ); // Firefox currently returns in charCode


    if( thisdtp.newChar === undefined ) { // ignorable key
      $( ev.target ).val( thisdtp.toString() );
      $( ev.target ).setCursorPosition( thisdtp.currentPosition ); 
      return;
    }

    var c = this.settings.format[ this.currentPosition ] || this.settings.format[ this.settings.format.length - 1 ] ;
    var pos = this.currentPosition;
    if( !this.goodChars[c] ) { 
      pos = this.nextFieldPosition();
      c = this.settings.format[ pos ];
    }
    else if($.isNumeric( this.newChar) ) {
      this.currentChars += this.newChar;
    }

    if( this.advanceChars[ this.newChar ] ) {
      pos = this.nextFieldPosition();
      this.currentChars = "";
    }
    else if( this.shouldAdvance( c ) ) {
      pos = this.nextFieldPosition();
      this.currentChars = "";
    }
    

    // Update the value, cursor position, highlighting, and hidden input field
    $(this.elm).val( this.toString() );
    if( pos != this.currentPosition )  { this.currentChars = "" ; }
    $(this.elm).setCursorPosition( pos );
    this.currentPosition = pos;
    this.refresh();
    this.updateHiddenInput();
  };

  // Detect backspace only - key press handled by keypressHandler
  $._dtpicker.prototype.keydownHandler = function( ev ) {

    // only handling backspace here - other 'real' characters handled by keypressHandler
    // Clear out the section of the format that is being edited, replacing it with the mm/MM characters
    // Disable normal backspace handling as we don't want the last character removed
    var key = ( ev.keyCode ? ev.keyCode : ev.charCode );
    if( key == 8 || key == 46 ) {
      var thisdtp = this;
      thisdtp.currentChars = "";
      thisdtp.currentPosition = $(this.elm).getCursorPosition();

      var c = thisdtp.settings.format[ thisdtp.currentPosition ] ;
      // If sitting before/at a ":" or "/" type character, operate on item before it
      if( !this.goodChars[c] && thisdtp.currentPosition > 0 ) {
        c = thisdtp.settings.format[ --thisdtp.currentPosition ] ;
      }
      // Clear that value
      if( c == 'Y' ) this.year = undefined;
      else if( c == 'M' ) this.month = undefined;
      else if( c == 'D' ) this.day = undefined;
      else if( c == 'h' ) this.hour = undefined;
      else if( c == 'm' ) this.minute = undefined;
      else if( c == 's' ) this.second = undefined;
      else if( c == 'a' ) this.ampm = undefined;
      // Refresh the element based on the new value and set the cursor
      $(this.elm).setCursorPosition( thisdtp.currentPosition );
      this.refresh();
      this.updateHiddenInput();
      // Don't allow backspace to do anything else
      ev.preventDefault();
      return false;
    }
  };



  // Defaults
  $.fn.dtpicker.defaults = {
    format: 'MM/DD/YYYY hh:mm aa',
    datepickerOpts: { },
  };


})(jQuery);





