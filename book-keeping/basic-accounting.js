const getWhen = (date, englishFormat) => {
    var year = date.getFullYear();

    var month = (1 + date.getMonth()).toString();
    month = month.length > 1 ? month : '0' + month;

    var day = date.getDate().toString();
    day = day.length > 1 ? day : '0' + day;
    
    if (englishFormat) {
        return day + '/' + month + '/' + year;
    }

    return year + '-' + month + '-' + day;
};

const defaultCostPerMile = 0.45;
const moneyRegEx = new RegExp(/^[0-9]+(\.[0-9]{2}){0,1}$/);
const milesRegEx = new RegExp(/^[0-9]+(\.[0-9]{1,2}){0,1}$/);
const emailRegEx = new RegExp(/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/);
const intRegEx = new RegExp(/^\d+$/);
var openRequest;
var db;
var miles = 0;
var timeOptions = [];
var bookEntry;
var customer;
var allCustomers = [];
var allCustomersDictionary = {};
const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
var defaultWhen = getWhen(new Date());
var currentView = 'entries';
var setting;
var deletingExpense = false;
var deletingBookEntry = false;

const updateValidationIndicator = (id, valid) => {
    removeValidationStatus(id);
    const containerId = '#' + id + 'Container';
    if (valid) {
        $(containerId).addClass('has-success');
    } else {
        $(containerId).addClass('has-danger');
    }
};

const hasValue = value => value.trim().length > 0;

const hasValidMoneyValue = value => moneyRegEx.test(value);

const hasValidMilesValue = value => milesRegEx.test(value);

const hasValidInteger = value => intRegEx.test(value);

const hasValidEmail = value => {
    value = value.trim();
    return value.length === 0 || emailRegEx.test(value);
};

const validate = (id, validation) => {
    var valid = validation($('#' + id).val());
    updateValidationIndicator(id, valid);
};

const addValidation = (id, validation) => {
    $('#' + id).blur(() => {
        validate(id, validation);
    });

    $('#' + id).change(() => {
        validate(id, validation);
    });
};

const scrollToTop = () => {
    $('#scrollTo')[0].scrollIntoView();
};

const addDbRecord = (table, record) => {
    return new Promise((resolve, reject) => {
        let transaction = db.transaction(table, "readwrite");
        let store = transaction.objectStore(table);

        let request = store.add(record);

        request.onsuccess = e => {
            resolve(e.target.result);
        };

        request.onerror = e => {
            reject(e);
        };
    });
};

const updateDbRecord = (table, record) => {
    return new Promise((resolve, reject) => {
        let transaction = db.transaction(table, "readwrite");
        let store = transaction.objectStore(table);

        let request = store.put(record);

        request.onsuccess = e => {
            resolve(e.target.result);
        };

        request.onerror = e =>{
            reject(e);
        };
    });
};

const deleteDbRecord = (table, id) => {
    return new Promise((resolve, reject) => {
        var transaction = db.transaction(table, "readwrite");
        var store = transaction.objectStore(table);

        var request = store.delete(id);

        request.onsuccess = e => {
            resolve();
        };

        request.onerror = e =>{
            reject(e);
        };
    });
};

const getDbRecord = async (table, id) => {
    return new Promise((resolve, reject) => {
        var transaction = db.transaction(table, "readwrite");
        var store = transaction.objectStore(table);
        var record = store.get(id);

        record.onsuccess = function() {
            resolve(record.result);
        };

        record.onerror = e =>{
            reject(e);
        };
    });
}

const processDbCursor = (request, resolve) => {
    let results = [];
    return () => {
        let cursor = request.result;
        if (cursor) {
            results.push(cursor.value);
            cursor.continue();
        } else {
            resolve(results);
        }
    };
};

const addCustomer = customer => addDbRecord('customer', customer);

const addSetting = setting => addDbRecord('settings', setting);

const addBookEntry = bookEntry => addDbRecord('bookEntry', bookEntry);

const addExpense = expense => addDbRecord('expenses', expense);

const updateBookEntryRecord = bookEntry => updateDbRecord('bookEntry', bookEntry);

const updateSettingRecord = setting => updateDbRecord('settings', setting);

const updateExpenseRecord = expense => updateDbRecord('expenses', expense);

const updateCustomerRecord = customer => updateDbRecord('customer', customer);

const dateFiltersChanged = () => {
    if (currentView === 'entries') {
        populateBookEntries();
    }

    if (currentView === 'expenses') {
        expenses();
    }
};

const dateFilters = () => {
    $('#fromDate').change(function() {
        dateFiltersChanged();
    });

    $('#toDate').change(function() {
        dateFiltersChanged();
    });
}

function createCustomer() {
    addValidation('name', hasValue);
    addValidation('addressLine1', hasValue);
    addValidation('town', hasValue);
    addValidation('postcode', hasValue);
    addValidation('miles', hasValidMilesValue);

    function createCustomerModalClick() {
        $('#bookEntries').hide();
        $('#bookEntry').hide();
        $('#findCustomer').hide();
        $('#createCustomerError').hide();
        $('#customers').hide();
        $('#name').val('');
        $('#addressLine1').val('');
        $('#town').val('March');
        $('#postcode').val('-');
        $('#miles').val('0');
        $('#createCustomer').show();
        $('#updateCustomer').hide();
        $('#customerDetails').show();

        removeValidationStatus('name');
        removeValidationStatus('addressLine1');
        removeValidationStatus('town');
        removeValidationStatus('postcode');
        removeValidationStatus('miles');

        $('#name').focus();
    }

    $('#createCustomerModal').click(createCustomerModalClick);
    $('#createCustomerModal2').click(createCustomerModalClick);
    $('#createCustomerModal3').click(createCustomerModalClick);

    $('#createCustomer').click(async () => {
        $('#createCustomerError').hide();
        var name = $('#name').val().trim();
        var addressLine1 = $('#addressLine1').val().trim();
        var town = $('#town').val().trim();
        var postcode = $('#postcode').val().trim();
        var miles = $('#miles').val().trim();

        validate('name', hasValue);
        validate('addressLine1', hasValue);
        validate('town', hasValue);
        validate('postcode', hasValue);
        validate('miles', hasValidMilesValue);

        if (name.length === 0 || addressLine1.length === 0 || town.length === 0 || postcode.length === 0 || !milesRegEx.test(miles)) return;

        var customer = {
            name: name,
            addressLine1: addressLine1,
            town: town,
            postcode: postcode,
            miles: parseFloat(miles),
            full: (name + addressLine1 + town + postcode).toLowerCase()
        };
        
        await addCustomer(customer);

        allCustomers = await getAllCustomers();

        buildCustomersDictionary(allCustomers);

        $('#customerDetails').hide();
        scrollToTop();
        customers();
    });
}

const editCustomer = async id => {
    customer = await getCustomerById(id);
    $('#bookEntries').hide();
    $('#createCustomerError').hide();
    $('#customerDetails').hide();
    $('#findCustomer').hide();
    $('#bookEntry').hide();
    $('#createBookEntry').hide();
    $('#customers').hide();

    $('#createCustomer').hide();
    $('#updateCustomer').show();
    $('#customerDetails').show();

    $('#name').val(customer.name);
    $('#addressLine1').val(customer.addressLine1);
    $('#town').val(customer.town);
    $('#postcode').val(customer.postcode);
    $('#miles').val(customer.miles);

    // could be an array supplied
    removeValidationStatus('name');
    removeValidationStatus('addressLine1');
    removeValidationStatus('town');
    removeValidationStatus('postcode');
    removeValidationStatus('miles');

    $('#name').focus();
};

const updateCustomer = () => {
    $('#updateCustomer').click(async () => {
        var name = $('#name').val().trim();
        var addressLine1 = $('#addressLine1').val().trim();
        var town = $('#town').val().trim();
        var postcode = $('#postcode').val().trim();
        var miles = $('#miles').val().trim();

        validate('name', hasValue);
        validate('addressLine1', hasValue);
        validate('town', hasValue);
        validate('postcode', hasValue);
        validate('miles', hasValidMilesValue);

        if (name.length === 0 || addressLine1.length === 0 || town.length === 0 || postcode.length === 0 || !milesRegEx.test(miles)) {
            return;
        }

        customer.name = name;
        customer.addressLine1 = addressLine1;
        customer.town = town;
        customer.postcode = postcode;
        customer.miles = parseFloat(miles);
        customer.full = (name + addressLine1 + town + postcode).toLowerCase();

        await updateCustomerRecord(customer);

        $('#customerDetails').hide();
        scrollToTop();
        customers();
    });
};

const createBookEntry = () => {

    addValidation('customer', hasValue);
    addValidation('when', hasValue);
    addValidation('summary', hasValue);
    addValidation('amount', hasValidMoneyValue);

    const createBookEntryModalScreen = () => {
        $('#createBookEntry').show();
        $('#updateBookEntry').hide();
        $('#bookEntries').hide();
        $('#createBookEntryError').hide();
        $('#customerDetails').hide();
        $('#findCustomer').hide();
        $('#customers').hide();
        $('#bookEntry').show();

        removeValidationStatus('customer');
        removeValidationStatus('when');
        removeValidationStatus('amount');
        removeValidationStatus('summary');

        $('#customerId').val('');
        $('#customer').val('');
        $('#when').val(defaultWhen);
        document.getElementById('whenTime').selectedIndex = 0;
        $('#amount').val('');
        $('#summary').val('');
        $('#when').focus();
    }

    $('#createBookEntryModal').click(createBookEntryModalScreen);
    $('#createBookEntryModal2').click(createBookEntryModalScreen);

    $('#customer').click(() => {
        $('#bookEntry').hide();
        showFindCustomer();
    });

    $('#createBookEntry').click(async () => {
        var customerId = $('#customerId').val().trim();
        var customer = $('#customer').val().trim();
        var when = $('#when').val();
        var whenTime = $('#whenTime').val();
        var amount = $('#amount').val().trim();
        var summary = $('#summary').val().trim();

        validate('customer', hasValue);
        validate('when', hasValue);
        validate('summary', hasValue);
        validate('amount', hasValidMoneyValue);

        var valid = customerId.length > 0 && when.length > 0 && moneyRegEx.test(amount) && summary.length > 0;

        if (!valid) {
            return;
        }

        var bookEntry = {
            customerId: parseInt(customerId),
            when: new Date(when + 'T' + whenTime),
            summary: summary,
            amount: parseFloat(amount),
        };

        let id = await addBookEntry(bookEntry);
        bookEntry.id = id;
        $('#bookEntry').hide();
        scrollToTop();
        populateBookEntries([ bookEntry ], true);
    });
}

const editBookEntry = async id => {
    bookEntry = await getBookEntryById(id);
    $('#bookEntries').hide();
    $('#createBookEntryError').hide();
    $('#customerDetails').hide();
    $('#findCustomer').hide();
    $('#bookEntry').show();
    $('#createBookEntry').hide();
    $('#customers').hide();
    $('#updateBookEntry').show();

    $('#customerId').val(bookEntry.customerId);
    $('#customer').val(getFriendlyCustomerInformation(allCustomersDictionary[bookEntry.customerId]));
    var when = bookEntry.when.toISOString();
    var date = when.substr(0, when.indexOf('T'));
    $('#when').val(date);
    $('#amount').val(bookEntry.amount.toFixed(2));
    $('#summary').val(bookEntry.summary);

    document.getElementById('whenTime').selectedIndex = 0;

    var time = when.substr(when.indexOf('T') + 1);
    time = time.substr(0, 5);

    for (var i = 0; i < timeOptions.length; i++) {
        if (timeOptions[i].text === time) {
            document.getElementById('whenTime').selectedIndex = i;
            break;
        }
    }

    removeValidationStatus('customer');
    removeValidationStatus('when');
    removeValidationStatus('amount');
    removeValidationStatus('summary');

    $('#when').focus();
};

const updateBookEntry = () => {
    $('#updateBookEntry').click(async () => {
        var customerId = $('#customerId').val().trim();
        var customer = $('#customer').val().trim();
        var when = $('#when').val();
        var whenTime = $('#whenTime').val();
        var amount = $('#amount').val().trim();
        var summary = $('#summary').val().trim();

        validate('customer', hasValue);
        validate('when', hasValue);
        validate('summary', hasValue);
        validate('amount', hasValidMoneyValue);

        var valid = customerId.length > 0 && when.length > 0 && moneyRegEx.test(amount) && summary.length > 0;

        if (!valid) {
            return;
        }

        bookEntry.customerId = parseInt(customerId);
        bookEntry.when = new Date(when + 'T' + whenTime);
        bookEntry.summary = summary;
        bookEntry.amount = parseFloat(amount);

        await updateBookEntryRecord(bookEntry);
        $('#bookEntry').hide();
        scrollToTop();
        populateBookEntries([ bookEntry ], true);
    });
};

const showFindCustomer = () => {
    $('#findCustomer').show();
    $('#filter').val('');
    $('#resultsBody').empty();
    $('#results').hide();
    $('#filter').focus();
    scrollToTop();
}

const findCustomer = () => {
    $('#resultsBody').empty();
    $('#searchError').hide();

    var filter = $('#filter').val().trim().toLowerCase();

    if (filter.length === 0) {
        return;
    }

    var html = '';

    var customers = allCustomers.filter(function(item) {return item.full.indexOf(filter) !== -1; });

    customers.forEach(function(customer) {
        html += '<tr><td><input type="radio" name="customerradio" onclick="javascript:selectChosenCustomer();" value="' + customer.id + '" data-miles="' + customer.miles + '" data-summary="' + getFriendlyCustomerInformation(customer) + '"></td><td>' + customer.name  + '</td><td>' + customer.addressLine1  + '</td><td>' + customer.town + '</td></tr>';
    });

    $('#results').show();
    $('#resultsBody').append(html);
};

const findCustomer2 = () => {
    $('#customersBody').empty();

    var filter = $('#customerFilter').val().trim().toLowerCase();

    if (filter.length === 0) {
        return;
    }

    var html = '';

    var customers = allCustomers.filter(function(item) {return item.full.indexOf(filter) !== -1; });

    customers.forEach(function(customer) {
        html += getCustomerRow(customer);
    });

    $('#customersBody').append(html);
};

const removeValidationStatus = id => {
    $('#' + id + 'Container').removeClass('has-success')
    $('#' + id + 'Container').removeClass('has-danger')
};

const selectChosenCustomer = () => {
    var input = $("input:radio[name='customerradio']:checked");

    var id = input.val();

    if (id === undefined) return;

    $('#findCustomer').hide();
    $('#bookEntry').show();

    $('#customerId').val(id);
    $('#customer').val(input.data().summary);
    removeValidationStatus('customer');
    $('#customerContainer').addClass('has-success')
    $('#createBookEntryError').hide();
    miles = parseFloat(input.data().miles)
};

const createExpense = () => {

    addValidation('expenseWhen', hasValue);
    addValidation('expenseSupplier', hasValue);
    addValidation('expenseSummary', hasValue);
    addValidation('expenseAmount', hasValidMoneyValue);
    addValidation('expenseMiles', hasValidMilesValue);

    $('#createExpenseModal').click(function() {
        $('#createBookEntry').show();
        $('#updateBookEntry').hide();
        $('#bookEntries').hide();
        $('#createBookEntryError').hide();
        $('#createExpenseError').hide();
        $('#customerDetails').hide();
        $('#findCustomer').hide();
        $('#customers').hide();
        $('#bookEntry').hide();
        $('#createExpense').show();
        $('#updateExpense').hide();
        $('#expenses').hide();

        $('#expense').show();

        var date = new Date().toISOString();
        date = date.substr(0, date.indexOf('T'));
        $('#expenseWhen').val(date);
        $('#expenseSupplier').val('');
        $('#expenseAmount').val('');
        $('#expenseSummary').val('');
        $('#expenseMiles').val('0');

        $('#expenseWhen').focus();

        removeValidationStatus('expenseWhen');
        removeValidationStatus('expenseSupplier');
        removeValidationStatus('expenseSummary');
        removeValidationStatus('expenseAmount');
        removeValidationStatus('expenseMiles');
    });

    $('#createExpense').click(async () => {
        var when = $('#expenseWhen').val();
        var amount = $('#expenseAmount').val().trim();
        var supplier = $('#expenseSupplier').val().trim();
        var summary = $('#expenseSummary').val().trim();
        var miles = $('#expenseMiles').val().trim();

        validate('expenseWhen', hasValue);
        validate('expenseSupplier', hasValue);
        validate('expenseSummary', hasValue);
        validate('expenseAmount', hasValidMoneyValue);
        validate('expenseMiles', hasValidMilesValue);

        var valid = when.length > 0 && supplier.length > 0 && summary.length > 0 && moneyRegEx.test(amount) && milesRegEx.test(miles);

        if (!valid) return;

        if (miles === undefined || miles === null)
            miles = 0;

        var expense = {
            when: new Date(when + 'T09:00'),
            supplier: supplier,
            summary: summary,
            amount: parseFloat(amount),
            miles: parseFloat(miles)
        };

        await addExpense(expense);
        expenses();
    });
};

const editExpense = async id => {
    expense = await getExpenseById(id);
    $('#bookEntries').hide();
    $('#createExpenseError').hide();
    $('#customerDetails').hide();
    $('#findCustomer').hide();
    $('#expense').show();
    $('#createBookEntry').hide();
    $('#customers').hide();
    $('#expenses').hide();
    $('#createExpense').hide();
    $('#updateExpense').show();

    var when = expense.when.toISOString();
    var date = when.substr(0, when.indexOf('T'));

    $('#expenseWhen').val(date);
    $('#expenseAmount').val(expense.amount.toFixed(2));
    $('#expenseSummary').val(expense.summary);
    $('#expenseSupplier').val(expense.supplier);
    $('#expenseMiles').val(expense.miles);

    removeValidationStatus('expenseWhen');
    removeValidationStatus('expenseSupplier');
    removeValidationStatus('expenseSummary');
    removeValidationStatus('expenseAmount');
    removeValidationStatus('expenseMiles');

    $('#expenseWhen').focus();
};

const updateExpense = () => {
    $('#updateExpense').click(async () => {
        var when = $('#expenseWhen').val();
        var amount = $('#expenseAmount').val().trim();
        var supplier = $('#expenseSupplier').val().trim();
        var summary = $('#expenseSummary').val().trim();
        var miles = $('#expenseMiles').val().trim();

        validate('expenseWhen', hasValue);
        validate('expenseSupplier', hasValue);
        validate('expenseSummary', hasValue);
        validate('expenseAmount', hasValidMoneyValue);
        validate('expenseMiles', hasValidMilesValue);

        var valid = when.length > 0 && supplier.length > 0 && summary.length > 0 && moneyRegEx.test(amount) && milesRegEx.test(amount);

        if (!valid) return;

        if (miles === undefined || miles === null)
            miles = 0;

        expense.when = new Date(when + 'T09:00'),
        expense.supplier = supplier;
        expense.summary = summary;
        expense.amount = parseFloat(amount);
        expense.miles = parseFloat(miles);

        await updateExpenseRecord(expense);
        expenses();
    });
};

const createSettings = () => {
    addValidation('reminderDurationInDays', hasValidInteger);
    addValidation('numberOfMonthsToShow', hasValidInteger);
    addValidation('costPerMile', hasValidMoneyValue);
    addValidation('email', hasValidEmail);
    addValidation('emailcopy', hasValidEmail);
};

const editSettings = id => {
    $('#bookEntries').hide();
    $('#createExpenseError').hide();
    $('#customerDetails').hide();
    $('#findCustomer').hide();
    $('#expense').hide();
    $('#createBookEntry').hide();
    $('#customers').hide();
    $('#expenses').hide();
    $('#findBookEntries').hide();

    $('#settings').show();

    var durationInDays = 30;
    var numberOfMonthsToShow = 3;
    var costPerMile = defaultCostPerMile;
    var email = '';
    var emailcopy = '';

    if (setting.durationInDays !== undefined && setting.durationInDays !== null) {
        durationInDays = setting.durationInDays;
    }
        
    if (setting.numberOfMonthsToShow !== undefined && setting.numberOfMonthsToShow !== null) {
        numberOfMonthsToShow = setting.numberOfMonthsToShow;
    }

    if (setting.costPerMile !== undefined && setting.costPerMile !== null) {
        costPerMile = setting.costPerMile;
    }

    if (setting.email !== undefined && setting.email !== null) {
        email = setting.email;
    }

    if (setting.emailcopy !== undefined && setting.emailcopy !== null) {
        emailcopy = setting.emailcopy;
    }
        
    $('#reminderDurationInDays').val(durationInDays.toString());
    $('#numberOfMonthsToShow').val(numberOfMonthsToShow);
    $('#costPerMile').val(costPerMile);
    $('#email').val(email);
    $('#emailcopy').val(emailcopy);

    removeValidationStatus('reminderDurationInDays');
    removeValidationStatus('numberOfMonthsToShow');
    removeValidationStatus('costPerMile');
    removeValidationStatus('email');
    removeValidationStatus('emailcopy');

    $('#reminderDurationInDays').focus();
};

const updateSettings = () => {
    $('#updateSettings').click(async () => {
        var durationInDays = $('#reminderDurationInDays').val().trim();
        var numberOfMonthsToShow = $('#numberOfMonthsToShow').val().trim();
        var costPerMile = $('#costPerMile').val().trim();
        var email = $('#email').val().trim();
        var emailcopy = $('#emailcopy').val().trim();

        validate('reminderDurationInDays', hasValidInteger);
        validate('numberOfMonthsToShow', hasValidInteger);
        validate('costPerMile', hasValidMoneyValue);
        validate('email', hasValidEmail);
        validate('emailcopy', hasValidEmail);

        var valid = intRegEx.test(durationInDays) && 
            intRegEx.test(numberOfMonthsToShow) && 
            moneyRegEx.test(costPerMile) && 
            (email.length === 0 || emailRegEx.test(email)) &&
            (emailcopy.length === 0 || emailRegEx.test(emailcopy));

        if (!valid) return;

        setting.durationInDays = parseInt(durationInDays);
        setting.numberOfMonthsToShow = parseInt(numberOfMonthsToShow);
        setting.costPerMile = parseFloat(costPerMile);
        setting.email = email;
        setting.emailcopy = emailcopy;

        await updateSettingRecord(setting);
        location.reload();
    });
};

const getFormattedDate = date => {
    var year = date.getFullYear();

    var month = (1 + date.getMonth()).toString();
    month = month.length > 1 ? month : '0' + month;

    var day = date.getDate().toString();
    day = day.length > 1 ? day : '0' + day;

    var hour = date.getHours().toString();
    hour = hour.length > 1 ? hour : '0' + hour
    
    var minute = date.getMinutes().toString();
    minute = minute.length > 1 ? minute : '0' + minute;
    
    return day + '/' + month + '/' + year + ' ' + hour + ':' + minute;
};

const deleteBookEntry = async id => {
    if (deletingBookEntry) return;

    var result = confirm('Are you sure?');

    if (!result) return;

    deletingBookEntry = true;
    
    await deleteDbRecord('bookEntry', id);

    populateBookEntries();
    deletingBookEntry = false;
};

const deleteExpense = async id => {
    if (deletingExpense) return;

    var result = confirm('Are you sure?');

    if (!result) return;

    deletingExpense = true;

    await deleteDbRecord('expenses', id);

    expenses();
    deletingExpense = false;
}

const getDataUsingDateFilters = async (store, ignoreDates, successCallback) => {
    return new Promise((resolve, reject) => {
        var index = store.index('when');
        var request;

        if (ignoreDates) {
            request = index.openCursor(null, ['prev']);
        } else {
            var dataFilters = getFromAndToDate();
            request = index.openCursor(IDBKeyRange.bound(dataFilters.fromDate, dataFilters.toDate), ['prev']);
        }

        request.onsuccess = processDbCursor(request, resolve);

        request.onerror = e => {
            reject(e);
        };
    });
};

const getAllBookEntries = async ignoreDates => {
    var bookEntriesTransaction = db.transaction("bookEntry", "readwrite");
    var bookEntriesStore = bookEntriesTransaction.objectStore('bookEntry');
    return await getDataUsingDateFilters(bookEntriesStore, ignoreDates);
};

const getAllSettings = async () => {
    return new Promise((resolve, reject) => {
        var settingsTransaction = db.transaction("settings", "readwrite");
        var settingsStore = settingsTransaction.objectStore('settings');
        var request = settingsStore.getAll();

        request.onsuccess = function() {
            resolve(request.result);
        };

        request.onerror = e => {
            reject(e);
        };
    });
};

const getFromAndToDate = () => {
    var fromDate = $('#fromDate').val() + 'T00:00:00';
    var toDate = $('#toDate').val() + 'T23:59:59';

    return {
        fromDate: new Date(fromDate),
        toDate: new Date(toDate)
    };
};

const getAllCustomers = async () => {
    return new Promise((resolve, reject) => {
        var customersTransaction = db.transaction("customer", "readwrite");
        var customersStore = customersTransaction.objectStore('customer');
        var index = customersStore.index('full');

        var request = index.openCursor(null, ['next']);
        
        request.onsuccess = processDbCursor(request, resolve);

        request.onerror = e => {
            reject(e);
        };
    });
};

const getAllExpenses = async ignoreDates => {
    var expensesTransaction = db.transaction("expenses", "readwrite");
    var expensesStore = expensesTransaction.objectStore('expenses');
    return await getDataUsingDateFilters(expensesStore, ignoreDates);
};

const getBookEntryById = async id => {
    return await getDbRecord('bookEntry', id);
};

const getCustomerById = async id => {
    return await getDbRecord('customer', id);
};

const getExpenseById = async id => {
    return await getDbRecord('expenses', id);
};

const getDateLabel = date => {
    return monthNames[date.getMonth()] + ' ' + date.getFullYear();
}

const toggleTable = tableId => {
    var visible = $('#' + tableId + ':visible').length > 0;
    
    var buttonText = $('#' + tableId + 'Button').text();

    if (visible) {
        $('#' + tableId).hide();
        buttonText = buttonText.substr(0, buttonText.length - 1) + '+';
    } else {
        $('#' + tableId).show();
        buttonText = buttonText.substr(0, buttonText.length - 1) + '-';
    }

    $('#' + tableId + 'Button').text(buttonText);
}

const processBookEntries = (bookEntries, removeCollapseButton) => {
    var html = "";
    var total = 0;
    var totalMiles = 0;
    var totalMilesCost = 0;
    var data = {};
    var keys = [];

    if (bookEntries.length > 0) {
        $('#bookEntriesSummary').show();
    }

    bookEntries.forEach(bookEntry => {
        var key = getDateLabel(bookEntry.when);
        
        if (!data[key]) {
            data[key] = [];
            keys.push(key);
        }

        data[key].push(bookEntry);
    });

    var expand = true;

    keys.forEach(key => {
        var currentTotal = 0;
        var currentMiles = 0;
        var currentMilesCost = 0;

        data[key].forEach(bookEntry => {
            var bookEntryCustomer = allCustomersDictionary[bookEntry.customerId];
            var miles = bookEntryCustomer.miles;

            if (miles === undefined || miles === null)
                miles = 0;

            total += bookEntry.amount;
            currentTotal += bookEntry.amount;
            totalMiles += miles;
            totalMilesCost += (miles * setting.costPerMile);
            currentMiles += miles;
            currentMilesCost += (miles * setting.costPerMile);
        });

        var tableId = key.replace(' ', '');
        var entries = data[key].length;
        var buttonAdditionalText = '&nbsp;&nbsp;(' + entries + ' ' + (entries === 1 ? 'entry' : 'entries') + ')';

        if (!removeCollapseButton) {
            html += '<div class="form-group"><button id="' + tableId + 'Button"class="btn btn-primary" type="button" data-toggle="collapse" data-target="#collapseExample" aria-expanded="false" aria-controls="collapseExample" onclick="toggleTable(\'' + tableId + '\')">' + key + ' ' + buttonAdditionalText + ' ' + (expand ? '-' : '+') + '</button></div>';
            html += '<div id="' + tableId + '"' + (expand ? '' : ' style="display:none"') + ' class="form-group"><label>Income: £' + currentTotal.toFixed(2) + '</label><br /><label>Miles: ' + currentMiles.toFixed(2) + '</label><br /><label>Miles cost: ' + currentMilesCost.toFixed(2) + '</label>';
        } else {
            $('#bookEntriesSummary').hide();
        }
        
        html += '<table class="table"><thead><tr><th>Date</th><th>Customer</th><th>Amount</th><th>Miles</th><th>Summary of work</th><th>Delete</th></tr></thead><tbody>';

        data[key].forEach(bookEntry => {
            var bookEntryCustomer = allCustomersDictionary[bookEntry.customerId];
            html += '<tr><td><a href="javascript:editBookEntry(' + bookEntry.id + ')">' + getFormattedDate(bookEntry.when) + '</a></td><td>' + bookEntryCustomer.friendly + '</td><td>£' + bookEntry.amount.toFixed(2) + '</td><td>' + bookEntryCustomer.miles.toFixed(2) + '</td><td>' + bookEntry.summary + '</td><td><button type="button" class="btn btn-primary" onclick="deleteBookEntry(' + bookEntry.id  + ')">Delete</button></td></tr>';
        });

        html += '</tbody></table></div>';
        expand = false;
    });

    $('#bookEntriesBody').html(html)
    $('#bookEntries').show();
    $('#total').html(total.toFixed(2));
    $('#totalMiles').html(totalMiles.toFixed(2));
    $('#totalMilesCost').html(totalMilesCost.toFixed(2));
};

const populateBookEntries = async (providedBookEntries, removeCollapseButton) => {

    $('#findBookEntries').hide();
    $('#bookEntryFilter').val('');

    currentView = 'entries';
    $('#bookEntry').hide();
    $('#customerDetails').hide();
    $('#findCustomer').hide();
    $('#customers').hide();
    $('#tools').hide();
    $('#expenses').hide();
    $('#expense').hide();
    $('#settings').hide();
    $('#dateFiltering').show();
    $('#bookEntries').show();

    $('#bookEntriesSummary').hide();

    if (providedBookEntries !== undefined) {
        $('#bookEntriesSummary').hide();
        processBookEntries(providedBookEntries, removeCollapseButton);
        return;
    }

    let allBookEntries = await getAllBookEntries();
    processBookEntries(allBookEntries, removeCollapseButton);
}

const download = async () => {
    let bookEntries = await getAllBookEntries(true);
    let customers = await getAllCustomers();
    let expenses = await getAllExpenses(true);
    let settings = await getAllSettings();

    let data = {
        bookEntries: bookEntries,
        customers: customers,
        expenses: expenses
    };

    var name = getFormattedDate(new Date());
    name = name.replace(' ', '_');
    name = name.replace(':', '-');
    name = name.replace(/\//g, '-');
    var fileName = 'book-entries-' + name + '.json';
    var zipFileName = 'book-entries-' + name + '.zip';

    var zip = new JSZip();
    zip.file(fileName, JSON.stringify(data));

    var content = await zip.generateAsync({type:"blob", compression: "DEFLATE"});

    // see FileSaver.js
    saveAs(content, zipFileName);

    var setting = settings[0];
    setting.downloaded = new Date();
    
    await updateSettingRecord(setting);

    if (setting.email !== undefined && setting.email !== null && setting.email.length > 0) {
        setTimeout(function() {
            var url = 'mailto:' + setting.email + '?subject=Book%20Keeping&body=Please%20attach%20the%20exported%20book%20keeping%20data from' + zipFileName;
            
            if (setting.emailcopy !== undefined && setting.emailcopy !== null && setting.emailcopy.length > 0) {
                url += '&cc=' + setting.emailcopy;
            }

            window.location.href = url;
        }, 2000);
    }
};

const updateProgress = progressMade => {
    $('#progress .progress-bar').html(progressMade + '%');
    $('#progress .progress-bar').css('width', progressMade + '%');
    $('#progress .progress-bar').attr('aria-valuenow', progressMade.toString());
};

const openFile = event => {
    updateProgress(1);

    $('#progress').show();
    
    var input = event.target;

    var reader = new FileReader();
    reader.onload = function() {
        JSZip.loadAsync(reader.result)
            .then(function(content) {
                var keys = Object.keys(content.files);
                return content.files[keys[0]].async('text');
            })
            .then(async json => {
                $('#bookEntries').hide();
                var state = JSON.parse(json);
                updateProgress(2);

                var recordsToImport = (state.customers.length + state.bookEntries.length + state.expenses.length) + 2;

                function showProgressToUser() {
                    var recordsImported = (numberOfCustomersImported + numberOfBookEntriesImported + numberOfExpensesImported) + 2;

                    var progressMade = parseInt(Math.floor((recordsImported / recordsToImport) * 100));

                    if (progressMade < 2) {
                        progressMade = 2;
                    }

                    if (progressMade > 99) {
                        progressMade = 99;
                    }

                    updateProgress(progressMade);
                }

                var customersTransaction = db.transaction("customer", "readwrite");
                var customersStore = customersTransaction.objectStore('customer');
                customersStore.clear();

                var numberOfCustomersImported = 0;
                var numberOfBookEntriesImported = 0;
                var numberOfExpensesImported = 0;

                for (var i = 0; i < state.customers.length; i++) {
                    await addCustomer(state.customers[i]);
                    numberOfCustomersImported++;
                    showProgressToUser();
                }

                var bookyEntryTransaction = db.transaction("bookEntry", "readwrite");
                var bookEntryStore = bookyEntryTransaction.objectStore('bookEntry');
                bookEntryStore.clear();

                for (var i = 0; i < state.bookEntries.length; i++) {
                    let bookEntry = state.bookEntries[i];
                    bookEntry.when = new Date(bookEntry.when);
                    delete bookEntry.customer;
                    delete bookEntry.miles;
                    await addBookEntry(bookEntry);
                    numberOfBookEntriesImported++;
                    showProgressToUser();
                }

                var expensesTransaction = db.transaction("expenses", "readwrite");
                var expensesStore = expensesTransaction.objectStore('expenses');
                expensesStore.clear();

                for (var i = 0; i < state.expenses.length; i++) {
                    let expense = state.expenses[i];
                    expense.when = new Date(expense.when);
                    await addExpense(expense);
                    numberOfExpensesImported++;
                    showProgressToUser();
                }

                allCustomers = await getAllCustomers();
                buildCustomersDictionary(allCustomers);

                $('#progress').hide();
                $("#importForm").get(0).reset();
                populateBookEntries();
            });
    };

    reader.readAsArrayBuffer(input.files[0]);
};

const initialiseSettings = async () => {
    let settings = await getAllSettings();
        
    if (settings.length === 0) {
        setting = { 
            durationInDays: 30,
            numberOfMonthsToShow: 3,
            costPerMile: defaultCostPerMile
        };
        await addSetting(setting);
    } else {
        setting = settings[0];
        
        if (setting.durationInDays === undefined || setting.durationInDays === null) {
            setting.durationInDays = 30;
        }

        if (setting.numberOfMonthsToShow === undefined || setting.numberOfMonthsToShow === null) {
            setting.numberOfMonthsToShow = 3;
        }

        if (setting.costPerMile === undefined || setting.costPerMile === null) {
            setting.costPerMile = defaultCostPerMile;
        }

        await updateSettingRecord(setting);
    }
};

const promptForDownload = () => {
    if (!setting.downloaded) {
        alert('You have never backed up data.  Please back up and email to yourself!');
        return;
    }

    var differenceInTime = Math.abs(new Date() - setting.downloaded);
    var days = Math.ceil(differenceInTime / (1000 * 60 * 60 * 24));
    
    if (days >= setting.durationInDays) {
        alert('You have not backed up data for over ' + setting.durationInDays + ' days.  Please back up and email to yourself!');
    }
}

const findBookEntries = async () => {
    let allBookEntries = await getAllBookEntries();

    let val = $('#bookEntryFilter').val().trim().toLowerCase();

    let filteredBookEntries = allBookEntries;

    if (val.length > 0) {
        filteredBookEntries = allBookEntries.filter((entry) => allCustomersDictionary[entry.customerId].full.indexOf(val) !== -1);    
    }

    processBookEntries(filteredBookEntries, false);
};

const searchBookEntries = () => {
    $('#searchBookEntries').click(() => {
        $('#findBookEntries').toggle();
        $('#bookEntryFilter').val('');
        findBookEntries();

        if ($('#findBookEntries').is(':visible')) {
            $('#bookEntryFilter').focus();
        }
    });

    var timeout;
    $('#bookEntryFilter').on('keyup input', function() {
        clearTimeout(timeout);
        timeout = setTimeout(findBookEntries, 100);
    });

};

const initialise = () => {
    openRequest = indexedDB.open('BookKeeping', 4);
    
    openRequest.onupgradeneeded = function(event) {
        db = openRequest.result;
        var transaction = event.target.transaction;

        if (!db.objectStoreNames.contains('customer')) {
            var store = db.createObjectStore('customer', { keyPath: 'id', autoIncrement: true });
            store.createIndex('full', ['full'], { unique:false });
        }

        if (!db.objectStoreNames.contains('bookEntry'))
            db.createObjectStore('bookEntry', { keyPath: 'id', autoIncrement: true });

        var bookEntryStore = transaction.objectStore('bookEntry');    
        
        if (bookEntryStore.indexNames.contains('when')) {
            bookEntryStore.deleteIndex('when');
        }

        if (!bookEntryStore.indexNames.contains('when')) {
            bookEntryStore.createIndex('when', 'when', { unique:false });
        }

        if (db.objectStoreNames.contains('expenses')) {
            var store = transaction.objectStore('expenses');
            if (store.indexNames.contains('when')) {
                store.deleteIndex('when');
            }
            store.createIndex('when', 'when', { unique:false });
        }

        if (!db.objectStoreNames.contains('expenses')) {
            var store = db.createObjectStore('expenses', { keyPath: 'id', autoIncrement: true });
            store.createIndex('when', 'when', { unique:false });
        }

        if (!db.objectStoreNames.contains('settings')) {
            var store = db.createObjectStore('settings', { keyPath: 'id', autoIncrement: true });
        }
    };

    openRequest.onsuccess = async () => {
        db = openRequest.result;

        await initialiseSettings();

        var toDate = new Date().toISOString();
        toDate = toDate.substr(0, toDate.indexOf('T'));
        $('#toDate').val(toDate);

        var today = new moment();
        var fromDate = today.add('month', -(setting.numberOfMonthsToShow - 1));
        fromDate = new Date(fromDate.toISOString());
        fromDate.setDate(1);
        fromDate = fromDate.toISOString();
        fromDate = fromDate.substr(0, fromDate.indexOf('T'));
        $('#fromDate').val(fromDate);

        createCustomer();
        createBookEntry();
        updateBookEntry();
        updateCustomer();
        createExpense();
        updateExpense();
        findCustomer();
        createSettings();
        updateSettings();
        dateFilters();
        searchBookEntries();

        $('#downloadButton').click(function() {
            download();
        });

        var date = new Date().toISOString();
        date = date.substr(0, date.indexOf('T'));
        $('#defaultWhen').val(date);

        timeOptions = document.getElementById('whenTime').options;

        var timeout;
        $('#filter').on('keyup input', function() {
            clearTimeout(timeout);
            timeout = setTimeout(findCustomer, 100);
        });

        $('#customerFilter').on('keyup input', function() {
            clearTimeout(timeout);
            timeout = setTimeout(findCustomer2, 100);
        });

        allCustomers = await getAllCustomers();
        buildCustomersDictionary(allCustomers);
        populateBookEntries();
        promptForDownload();
    };
};

const getFriendlyCustomerInformation = customer => customer.name + ', ' + customer.addressLine1 + ', ' + customer.town;

const buildCustomersDictionary = customers => {
    allCustomersDictionary = {};
    customers.forEach(cust => {
        cust.friendly = getFriendlyCustomerInformation(cust);
        allCustomersDictionary[cust.id] = cust;
    });
};

const customers = async () => {
    currentView = 'customers';
    $('#bookEntry').hide();
    $('#customerDetails').hide();
    $('#findCustomer').hide();
    $('#bookEntries').hide();
    $('#tools').hide();
    $('#expenses').hide();
    $('#dateFiltering').hide();
    $('#expense').hide();
    $('#settings').hide();
    $('#findBookEntries').hide();
    $('#customerFilter').val('');
    $('#customers').show();

    $('#customersBody').empty();

    allCustomers = await getAllCustomers();
    buildCustomersDictionary(allCustomers);

    var html = '';

    allCustomers.forEach(function(customer) {
        html += getCustomerRow(customer);
    });

    $('#customersBody').append(html);
};

const getCustomerRow = customer => '<tr><td><a href="javascript:editCustomer(' + customer.id + ')">' + customer.name  + '<a/></td><td>' + customer.addressLine1  + '</td><td>' + customer.town + '</td><td>' + customer.postcode + '</td><td>' + customer.miles + '</td></tr>';

const expenses = async () => {
    currentView = 'expenses';
    $('#bookEntry').hide();
    $('#customerDetails').hide();
    $('#findCustomer').hide();
    $('#bookEntries').hide();
    $('#tools').hide();
    $('#expense').hide();
    $('#dateFiltering').show();
    $('#customers').hide();
    $('#settings').hide();
    $('#findBookEntries').hide();

    $('#expenses').show();

    $('#expensesBody').empty();

    var total = 0;
    var totalMiles = 0;
    var totalMilesCost = 0;

    let expenses = await getAllExpenses();
    var html = '';

    expenses.forEach(function(expense) {
        total += expense.amount;
        totalMiles += expense.miles;
        totalMilesCost += (expense.miles * setting.costPerMile);
        html += '<tr><td><a href="javascript:editExpense(' + expense.id + ')">' + getWhen(expense.when, true) + '<a/></td><td>' + expense.supplier  + '</td><td>' + expense.summary + '</td><td>' + expense.amount.toFixed(2) + '</td><td>' + expense.miles.toFixed(2) + '</td><td><button type="button" class="btn btn-primary" onclick="deleteExpense(' + expense.id  + ')">Delete</button></td></tr>';
    });

    $('#totalExpenses').html(total.toFixed(2));
    $('#totalExpenseMiles').html(totalMiles.toFixed(2));
    $('#totalExpenseMilesCost').html(totalMilesCost.toFixed(2));

    $('#expensesBody').append(html);
};

const showSettings = async () => {
    currentView = 'settings';
    $('#bookEntry').hide();
    $('#customerDetails').hide();
    $('#findCustomer').hide();
    $('#bookEntries').hide();
    $('#tools').hide();
    $('#expense').hide();
    $('#dateFiltering').hide();
    $('#customers').hide();
    $('#expenses').hide();
    $('#progress').hide();
    $('#findBookEntries').hide();

    $('#settings').show();

    let allSettings = await getAllSettings();
    setting = allSettings[0];

    editSettings();
};

const tools = () => {
    currentView = 'tools';
    $('#tools').show();
    $('#bookEntries').hide();
    $('#bookEntry').hide();
    $('#findCustomer').hide();
    $('#createCustomerError').hide();
    $('#expenses').hide();
    $('#expense').hide();
    $('#customers').hide();
    $('#dateFiltering').hide();
    $('#settings').hide();
    $('#findBookEntries').hide();
};

const collapseDropDownMenu = () => {
    $('#dropDownMenu').removeClass('in');
};