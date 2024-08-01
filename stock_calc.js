let num_years;
let stock_price = 'Not Calculated';
let upd_stock_price_flag = false;

let calc_table_vals = 
[[                                '', 'Current Year', 'Year 1', 'Year 2', 'Year 3', 'Year 4', 'Year 5', 'Year 6',
                                      'Year 7', 'Year 8', 'Year 9', 'Year 10'],
 [                         'Revenue', 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00],
 [                '% Revenue Growth', 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00],
 [           '% Gross Profit margin', 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00],
 [              'Operating Expenses', 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00],
 [               'Interest Expenses', 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00],
 [                  'Other Expenses', 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00],
 [                      'Net Income', 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00],
 [        'Book Value (End of Year)', 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00],
 [       'Share Count (End of Year)', 1.00]];

let calc_ctrl_panel_vals = 
[[               'Marginal Tax Rate', 15.00],
 [            'Terminal Growth Rate',  5.00],
 [ 'Equity Capital Opportunity Cost', 10.00]];


// Performs a banker's round of a number to a number of decimal points (num_decs). Banker's rounding is used
// because it removes rounding bias as the calculator rounds values. JavaScript's default Math.Round() function rounds
// numbers ending with 0.5 up. This creates bias. Banker's rounding rounds numbers ending with 0.5 to the nearest
// even number. Values are rounded when data is transferred from HTML to the calculator and when values are recomputed
// after data entry in HTML.
// Due to JavaScript's number data type, bankers_round(3.000, 2) returns the value 3. However, bankers_round(3.149, 2)
// returns the value 3.15.
function bankers_round(num, num_decs)
{
    let x = num * Math.pow(10, num_decs);
    let r = Math.round(x);
    let br = (((((x>0)?x:(-x))%1)===0.5)?(((0===(r%2)))?r:(r-1)):r);
    return br / Math.pow(10, num_decs);
}


// Clears all fields of the calculator and resets the marginal tax rate, terminal growth rate, and equity capital
// opportunity cost fields to their default values (control panel values). The model's stock price is set to 
// 'Not Calculated'.  transfer_html_to_model() must be called afterwards to push updates to HTML.
function clear_calc()
{
    // 1. Reset the control panel's values to their default states.
    let calc_ctrl_panel_vals = 
    [[               'Marginal Tax Rate', 15.00],
     [            'Terminal Growth Rate',  5.00],
     [ 'Equity Capital Opportunity Cost', 10.00]];

    // 2. Reset the calculator table's values to their default states.
    calc_table_vals = 
    [[                                '', 'Current Year', 'Year 1', 'Year 2', 'Year 3', 'Year 4', 'Year 5', 'Year 6',
                                          'Year 7', 'Year 8', 'Year 9', 'Year 10'],
     [                         'Revenue', 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00],
     [                '% Revenue Growth', 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00],
     [           '% Gross Profit margin', 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00],
     [              'Operating Expenses', 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00],
     [               'Interest Expenses', 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00],
     [                  'Other Expenses', 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00],
     [                      'Net Income', 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00],
     [        'Book Value (End of Year)', 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00],
     [       'Share Count (End of Year)', 1.00]]

    // 3. Reset stock price on calculator's display.
    stock_price = 'Not Calculated';
}


// Accepts a string. The function will add commas in to the whole number (left of decimal) portion of the string. This
// groups digits into groups of three. For example, the string '1000' will be converted to '1,000'.

// This function provides no input string format interpretation. It has no input validation and could cause a crash.
// All strings should be input with a string with a numeric format such as '-1000.9', '2000', '0.39', etc. All other
// input types result in undefined behavior.

// The mode must be input as well. A mode of "percent" will add a percent sign to the string. A mode of "number" will
// not add a percent sign. If an incorrect mode is passed, the original string is returned.
function format_str_numerical(str, mode)
{
    if(mode != 'percent' && mode != 'number')
        return str;

    let formatted_str = '';
    let has_period_char = str.includes('.');
    let parts = str.split('.');

    formatted_str = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');

    if(has_period_char)
        formatted_str += '.' + parts[1];
    if(mode == 'percent')
    {
        if(str.charCodeAt(str.length - 1) != 37 && str != '-')     // Char code for '%'.
            formatted_str = formatted_str + '%';
    }

    return formatted_str;
}


// Returns a number for a given string. The function first filters out any non-numeric characters but will match the '.' 
// and '-' characters. This string is then passed to attempted to be parsed by the parseFloat() function. Returns NaN if
// the resulting string cannot be parsed as a number.
function get_float_from_str(str)
{
    return parseFloat(str.replace(/[^\d.-]/g, ''));
}


// Initializes the HTML calculator's DOM elements. This function is called when the onload event occurs for the <body>
// element.
function init_calc_page()
{
    // This will set the columns to hidden based on the value of the number of years slider (id = id_input__slider)
    // when the document is loaded. The slider's default value is 7. The hidden attribute is already applied so that
    // seven years (Year 1 - Year 6) will appear on start up. This is redundant but is called to ensure that the inital
    // number of years matches the value in the number of years slider.
    resize_calc_table();
    transfer_model_to_html();
}


// Recomputes revenue growth, net income, book value, and stock price and stores values in internal storage. Rounds any
// computed values to two decimal points.
function recompute_model()
{
    let new_val             = 0.00;
    let rev_row             = calc_table_vals[1];
    let rev_growth_row      = calc_table_vals[2];
    let gross_marg_row      = calc_table_vals[3];
    let op_exp_row          = calc_table_vals[4];
    let int_exp_row         = calc_table_vals[5];
    let oth_exp_row         = calc_table_vals[6];
    let net_inc_row         = calc_table_vals[7];
    let book_val_row        = calc_table_vals[8];

    let marg_tax_rate       = calc_ctrl_panel_vals[0][1];
    let term_growth_rate    = calc_ctrl_panel_vals[1][1];
    let equity_ror          = calc_ctrl_panel_vals[2][1];
    let num_shares          = calc_table_vals[9][1];

    let discounted_residuals_ttl = 0, terminal_residual = 0;
    let row_len = rev_row.length;

    // 1. Compute revenue for each year. 2 is the starting column for revenue that needs to be computed.
    for(let i = 2; i < row_len; i++)
    {
        new_val = rev_row[i - 1] + Math.abs(rev_row[i-1]) * (rev_growth_row[i]/100);
        rev_row[i] = bankers_round(new_val, 2);
    }

    // 2. Compute net income for each year.
    for(let i = 1; i < row_len; i++)
    {
        new_val = (1 - marg_tax_rate/100) *
                  (rev_row[i] * (gross_marg_row[i]/100) - op_exp_row[i] - int_exp_row[i] - oth_exp_row[i]);
        net_inc_row[i] = bankers_round(new_val, 2)
    }

    // 3. Compute book value for each year.
    for(let i = 2; i < row_len; i++)
    {
        new_val = net_inc_row[i - 1] + book_val_row[i - 1];
        book_val_row[i] = bankers_round(new_val, 2);
    }

    // 4. Transfer the recomputed rows back to internal storage.
    calc_table_vals[1] = rev_row;
    calc_table_vals[7] = net_inc_row;
    calc_table_vals[8] = book_val_row;

    // 5. Compute stock price and store in internal storage. Only compute up to the amount of years being displayed
    // (num_years).
    for(let i = 2; i < num_years + 2; i++)
    {
        let resid_income = (net_inc_row[i] - book_val_row[i - 1] * (equity_ror/100));
        discounted_residuals_ttl += resid_income / (Math.pow(1 + equity_ror/100, i - 1));

        // Terminal value is added for the last year in the model.
        if(i == num_years + 1)
        {
            terminal_residual = resid_income / (equity_ror/100 - term_growth_rate/100);
            discounted_residuals_ttl += terminal_residual/(Math.pow(1 + equity_ror/100, i - 1));
        }
    }

    // 6. The total discounted residual value is added to initial book value. (See wikipedai article on
    // "Residual Income Valuation". Store the stock price.
    stock_price = bankers_round((book_val_row[1] + discounted_residuals_ttl)/num_shares, 2);
}


// This function should be used with the onfocusin event. If an <input> element triggers this event, the <input>
// element's value is changed if its current value is '-'. This would occur on a blank input cell in the calculator
// table. 
function remove_empty_char_on_focus(event)
{
    let targ_element = event.target;

    if(targ_element.nodeName != 'INPUT')
        return;

    let str_value = targ_element.value;

    if(str_value == '-')
        targ_element.value = '';
}


// Resizes the calculator table. This is done by taking the amount of years the user indicated they wanted to see
// with the slider.
function resize_calc_table()
{
    // The number of projection years (Year 1 and beyond).
    num_years = parseInt(document.getElementById('id_input__slider').value);

    // 'idx_hidden' is the beginning index for all rows where the table should not be displayed.
    // For row ['Year', 'Current Year', 'Year 1', 'Year 2', 'Year 3', 'Year 4', 'Year 5', 'Year 6', 'Year 7'], if
    // num_years is 1, then everything after 'Year 1' is be hidden. 'Year 1' would still be displayed'. Recall that
    // num_years is the number of years that is being modeled beyond the current year.
    let idx_hidden = 2 + num_years;
    let rows = document.getElementById('id_table__calculator_table').rows;

    // Iterate through the cells in each row. If the cell's index is greater than idx_hidden, do not display that cell.
    for(let i = 0; i < rows.length; i++)
    {
        let cur_row = rows[i].cells;

        for(let j = 0; j < cur_row.length; j++)
        {
            let cur_cell = cur_row[j];
            if(j < idx_hidden)
                cur_cell.hidden = false;
            else
                cur_cell.hidden = true;
        }
    }
}


// This function is called when the Calculate or Clear button is pressed. It allows the stock price to be updated when
// the model is transferred to HTML. These two buttons call the transfer_model_to_html() function. On the next transfer,
// the flag will be set to false. Either button must be pressed again to allow further stock price transfers to HTML.
function set_stock_price_upd_flag_true()
{
    upd_stock_price_flag = true;
}


// Retrieves text information from the <td> and <td> table cell elements of the calculator table.
function table_cell_retrieve(cell)
{
    // This if statement distinguishes between <td> and <th> elements do not have an <input> child vs. <td> and <th>
    // elements that do have an <input> child. If the number of child nodes is greater than 1, the <td> or <th>
    // element has an <input> child element at position 1. This is based on the structure of the HTML file associated
    // with this function.

    // If there is no <input> child, the textContent of the <td> or <th> element must be be acquired. If the <td> or
    // <th> element has an <input> child, the value of the <input> child must be acquired, not the parent's textContent.
    if(cell.childNodes.length > 1)                             // Has an <input> child, acquire <input> child's value.
        return cell.childNodes[1].value;
    else                                                       // No <input> child, acquire textContent of parent.
        return cell.textContent;
}


// Stores text information in the <td> and <th> table cell elements of the calculator table so that it can be displayed.
function table_cell_store_text(cell, str)
{
    // This if statement distinguishes between <td> and <th> elements do not have an <input> child vs. <td> and <th>
    // elements that do have an <input> child. If the number of child nodes is greater than 1, the <td> or <th>
    // element has an <input> child element at position 1. This is based on the structure of the HTML file associated
    // with this function.

    // If there is no <input> child, the textContent of the <td> or <th> element must be  changed. If the <td> or <th>
    // element  has an <input> child, the value of the <input> child must be changed, not the parent's textContent.
    if(cell.childNodes.length > 1)                             // Has an <input> child, modify <input> child's value.
        cell.childNodes[1].value = str;
    else                                                       // No <input> child, modify textContent of parent.
        cell.textContent = str;
}


// This function transfers information from the calculator table in HTML to internal storage called "calc_table_vals".
// This function transfers information from the control panel in HTML to internal storage called "calc_ctrl_panel_vals".
// Rounds any input from the HTML input fields to two decimal places.

// Adds commas and percentage signs to fields inside the calculator that require it. This function is set as one of the
// targets for the onfocusout event in the calculator's <article> element. The function will format <input> and <td> &
// <th> elements. This includes elements in both the calculator control panel and the calculator table.
function transfer_html_to_model()
{
    let rows = document.getElementById('id_table__calculator_table').rows, element_ids = null;
    
    // 1. Transfer input data from the HTML table with id "id_table__calculator_table" to the internal storage.
    //
    // Start at i = 1 and j = 1 to start at data cells. Notice that columns with index = 0 and row with index = 0, do
    // not contain any input fields. See "id_table__calculator_table" for the HTML definition of the calculator table.
    for(let i = 1; i < rows.length; i++)
    {
        let cur_row = rows[i].cells;
        let str_value = '',  sanitized_value = '';
        let float_value = 0.00;

        for(let j = 1; j < cur_row.length; j++)
        {
            let cur_cell = cur_row[j];
            
            str_value = table_cell_retrieve(cur_cell);

            // Remove any non-numeric characters and period characters. If there is more than one period character,
            // parseFloat will return NaN and the model will set the value to 0. Since 
            // verify_numerical_while_inputting() removes extra decimal points on input, extra decimal points aren't
            // expected.
            float_value = get_float_from_str(str_value);

            // isNaN() will return true if a cell contains a value such as '-' or if it otherwise can't be processed
            // as a float. Values that can't be processed are interpretted as being 0.
            if(isNaN(float_value))
                calc_table_vals[i][j] = 0.00;
            else
                // Rounds to the nearest hundredth place using banker's rounding. If float_value = 3, the table will
                // store a number type with its value set to 3. JavaScript represents the number 3.00 as a number type
                // with value 3.
                calc_table_vals[i][j] = bankers_round(float_value, 2)
        }
    }

    // 2. Transfers input data from the HTML fieldset with id "id_form__calculator_control_panel", the calculator
    // control panel, to internal storage.
    element_ids = ['id_input__marginal_tax_rate', 'id_input__terminal_growth_rate',
                   'id_input__equity_capital_opportunity_cost'];

    for(let i = 0; i < 3; i++)
    {
        float_value = get_float_from_str(document.getElementById(element_ids[i]).value);
        if(isNaN(float_value))
            float_value = 0.00;

        calc_ctrl_panel_vals[i][1] = bankers_round(float_value, 0);
    }
}


// This function transfers information from internal storage called "calc_table_vals" to the HTML of the calculator
// table. This function transfers information from internal storage called "calc_ctrl_panel_vals" to the HTMl of the
// calculator control panel. Lastly, the function transfers the model's predicted stock price to HTML.
function transfer_model_to_html()
{
    let final_value = '', orig_value = '', trunc_value = '';
    let rows = document.getElementById('id_table__calculator_table').rows, element_ids = null;

    // 1. Transfer values from calc_table_vals, the model's representation of the calculator table, to HTML.
    for(let i = 0; i < rows.length; i++)
    {
        let cur_row = rows[i].cells;

        for(let j = 0; j < cur_row.length; j++)
        {
            let cur_cell = cur_row[j];
            
            // Retrieve all values from the model's calculator table as strings. Some entries such as those in the first 
            // row or leftmost column are already strings. Others, such as elements in the table, are numbers.
            // All values are initially converted to strings to make the code easier to understand.
            orig_value = calc_table_vals[i][j].toString();

            if(orig_value === '0')
                final_value = '-';
            // Corresponds to values not in the leftmost column or uppermost row. They are JavaScript numbers in 
            // internal storage and should be formatted as numbers.
            else if(i > 0 && j > 0)
            {
                // Ensures that numerical values are outputted with 2 decimal places shown The maximum fraction digit
                // number does not need to be specified because table values are rounded to two decimal places on
                // input by transfer_html_to_model().

                // In transfer_html_to_model(), values are rounded to two decimal places. However, since JavaScript
                // represents numbers such as 3.00 as number types with value 3, it is necessary to ensure that the
                // minimum number of fraction digits is 2. Otherwise, the table would display the value "3" and not
                // "3.00".

                let trunc_value = parseFloat(orig_value).toLocaleString("en", {minimumFractionDigits: 2});

                // Rows with indices 2 and 3 (Revenue Growth % and Gross Margin %) must be displayed as percentages.
                if(i == 2 || i == 3)
                    final_value = format_str_numerical(trunc_value, 'percent');
                else
                    final_value = format_str_numerical(trunc_value, 'number');
            }
            // Values in the leftmost or uppermost row such as strings like 'Revenue' are copied directly to HTML in the
            // statement following this branch. final_value can be set to the original_value that was retrieved from
            // internal storage.
            else
                final_value = orig_value;
            table_cell_store_text(cur_cell, final_value);
        }
    }

    // 2. Transfer values from calc_ctrl_panel_vals, the model's representation of the calculator control panel, to
    // HTML.
    element_ids = ['id_input__marginal_tax_rate', 'id_input__terminal_growth_rate',
                   'id_input__equity_capital_opportunity_cost'];

    for(let i = 0; i < 3; i++)
    {
        // orig_value will always be a number. toLocaleString() will later convert it to a string.
        orig_value = calc_ctrl_panel_vals[i][1];
        trunc_value = orig_value.toLocaleString("en", {minimumFractionDigits: 0});
        final_value = format_str_numerical(trunc_value, 'percent');

        document.getElementById(element_ids[i]).value = final_value;
    }
   
    // 3. Transfer the predicted stock price to the stock price <output> element in HTML.
    orig_value = stock_price.toString();

    // The stock price can either be a number or the string 'Not Calculated'. If it is a number, it must be formatted.
    if(orig_value === 'Not Calculated')
    {
        final_value = orig_value;
    }
    else
    {
        // Ensures that numerical values are outputted with two decimal values. This command will round the stock price
        // to the nearest hundredth. For example, 0.005 rounds to 0.01. However, rounding is not expected to occur 
        // because the stock price is already rounded in the recompute_model() function. If the stock price is
        // represented as a number such as 3, the function will transfer the string "3.00". This is done by specifying
        // the minimum number of fraction digits. The number representation of 3.00 in JavaScript is 3. This
        // ensures that the HTML displays "3.00" and not "3".
        trunc_value = parseFloat(orig_value).toLocaleString("en", {minimumFractionDigits: 2});
        final_value = format_str_numerical(trunc_value, 'number');
    }
    
    // Only transfer the price to HTML after the Calculate button or Clear button has been pressed. upd_stock_price_flag
    // is the variable that isset to true when this has occurred. Later, set the variable to false so the price will
    // onlytransfer when calculate has been pressed.
    if(upd_stock_price_flag === true)
    {
        upd_stock_price_flag = false;
        document.getElementById('id_output__predicted_stock_price').value = final_value;
    }
}


// This function accepts an event. In this project, the event is an InputEvent originating from an <input> element in an
// HTML document. The <input> element must have the type attribute set to text. The <input> element's oninput attribute
// is set to call this function.
//
// This function will set the value of the triggering <input> element to remove any character that isn't numeric
// ('0' through '9') or a single '.' character. This will make it so that user's input into <input> elements are
// formatted as a number. Any additional '.' characters will be removed beyond the first one.
//
// The main purpose of this function is to format input while the user is entering values in the calculator. This will
// only allow the user to enter numeric data and a single '.' character.
function verify_numerical_while_inputting(event)
{
    let targ_element = event.target;
    // orig_value should be a string since this function must be called by an element with its "type" attribute set to
    // text.
    let orig_value = targ_element.value;
    let sanitized_value = '', final_value = '';
    let has_period_char = false;

    // 1. Only include numeric characters from '0' to '9' and a single '.'.
    for(let i = 0; i < orig_value.length; i++)
    {
        let char_code = orig_value.charCodeAt(i);
        if((char_code >= 48 && char_code <= 57))    // Char codes for '0' through '9'.
            sanitized_value += orig_value[i];

        // Only include one '.' character in a number.
        if(char_code == 46 && !has_period_char)     // Char code for '.'.
        {
            sanitized_value += orig_value[i];
            has_period_char = true;
        }
    }

    // 2. Build the final string that will contain commas in the whole number portion (i.e. to the left of '.').
    let parts = sanitized_value.split('.');

    final_value = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    if(has_period_char)
        final_value = final_value + '.' + parts[1];
    if(orig_value[0] == '-')
        final_value = '-' + final_value;

    // 3. Transfer the final string to the <input> element's value.
    targ_element.value = final_value;
}