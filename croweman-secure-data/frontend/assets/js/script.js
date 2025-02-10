var entryManager = {};

$(function(){

    var groupId = undefined;
    var entryId = undefined;

    $('#createGroup').on('click', function() {
        $('#group-heading').html('Create group');
        createGroup();
    });

    $('#export').on('click', function() {
        exportData();
    });

    $('#export-decrypted').on('click', function() {
        exportDataDecrypted();
    });

    $('#createEntry').on('click', function() {
        $('#entry-heading').html('Create entry');
        createEntry();
    });

    $('#addGroup').on('click', function() {
        addGroup();
    });

    $('#updateGroup').on('click', function() {
        updateGroup();
    });

    $('#removeGroup').on('click', function() {
        removeGroup();
    });

    $('#cancelGroup').on('click', function() {
        cancelGroup();
    });


    $('#addEntry').on('click', function() {
        addEntry();
    });

    $('#updateEntry').on('click', function() {
        updateEntry();
    });

    $('#removeEntry').on('click', function() {
        removeEntry();
    });

    $('#cancelEntry').on('click', function() {
        cancelEntry();
    });

    $('#copyUserName')[0].addEventListener('click', copy, true);
    $('#copyEmail')[0].addEventListener('click', copy, true);
    $('#copyPassword')[0].addEventListener('click', copy, true);

    function copy(e) {

        var t = e.target,
            c = t.dataset.copytarget,
            inp = (c ? document.querySelector(c) : null);

        if (inp && inp.select) {

            inp.select();

            try {
                document.execCommand('copy');
                inp.blur();
            }
            catch (err) {
                alert('please press Ctrl/Cmd+C to copy');
            }

        }

    }

    getGroups();

    function getGroups() {

        $.ajax({
            type: "GET",
            url: '/groups',
            dataType: 'json',
            async: true,
            success: function (groups) {
                var data = $('#data');
                data.empty();

                for (var i = 0; i < groups.length; i++) {

                    var group = groups[i];
                    var groupClassName = 'group-item';

                    if (i == 0)
                        groupClassName += ' first';

                    var html = '<li class="' + groupClassName + '"> <a href="javascript:entryManager.getGroup(\'' + group.id.trim() + '\');" title="Edit group"> <span class="group-name">' + group.title + '</span> <i class="edit-group-icon fa fa-edit fa-lg"></i> <a href="javascript:entryManager.createNewEntry(\'' + group.id.trim() + '\');" class="create-entry" title="Create entry"><i class="fa fa-book fa-lg"></i></a><ul>';

                    for (var j = 0; j < group.entries.length; j++) {

                        var entry = group.entries[j];
                        var className = 'entry-item';

                        if (j == 0)
                            className += ' first';

                        html += '<li class="' + className + '"> <a href="javascript:entryManager.getEntry(\'' + group.id.trim() + '\', \'' + entry.id.trim() + '\');" title="' + entry.title + '"><span class="entry-name">' + entry.title + '</span><i class="edit-entry-icon fa fa-edit fa-lg"></i></a></li>';
                    }

                    html += '</ul></li>';

                    var element = $(html);
                    element.appendTo(data);
                }

                $('#entries').show();
            }
        })
    }

    function createGroup() {

        groupId = undefined;
        entryId = undefined;
        $('#groupTitle').val('');

        $('#group-heading').html('Create group');

        $('#createEntry').hide();
        $('#addGroup').show();
        $('#updateGroup').hide();
        $('#removeGroup').hide();
        $('#group-container').show();
        $('#entries').hide();
        $('#groupTitle').focus();
    }

    function addGroup() {

        var group = {
            title: $('#groupTitle').val().trim()
        }

        if (group.title.length == 0) {
            alert('You must enter a title!');
            return;
        }

        $.ajax({
            type: "POST",
            url: '/addGroup',
            dataType: 'json',
            async: true,
            data: group,
            success: function () {

                $('#group-container').hide();
                getGroups();
                $('#entries').show();

            }
        });
    }

    function getGroup(id) {

        id = id.trim();

        $.ajax({
            type: "GET",
            url: '/getGroup/' + id,
            dataType: 'json',
            async: true,
            success: function (group) {

                groupId = id;
                entryId = undefined;

                $('#groupTitle').val(group.title);

                $('#group-heading').html('Edit group');

                $('#createEntry').show();
                $('#addGroup').hide();
                $('#updateGroup').show();
                $('#removeGroup').show();
                $('#group-container').show();
                $('#entries').hide();
                $('#groupTitle').focus();
            }
        })

    }

    function updateGroup() {

        if (!groupId) return;

        // if (!confirm("Are you sure you want to update this group!"))
        //     return;

        var group = {
            id: groupId,
            title: $('#groupTitle').val().trim()
        }

        if (group.title.length == 0) {
            alert('You must enter a title!');
            return;
        }

        $.ajax({
            type: "POST",
            url: '/updateGroup/' + groupId,
            dataType: 'json',
            async: true,
            data: group,
            success: function () {

                $('#group-container').hide();
                getGroups();
                $('#entries').show();
            }
        });
    }

    function removeGroup() {

        if (!groupId) return;

        if (!confirm("Are you sure you want to delete this group!"))
            return;

        $.ajax({
            type: "POST",
            url: '/removeGroup/' + groupId,
            dataType: 'json',
            async: true,
            success: function () {

                $('#group-container').hide();
                getGroups();
                $('#entries').show();
            }
        })
    }

    function cancelGroup() {
        $('#group-container').hide();
        getGroups();
        $('#entries').show();
    }

    function exportData() {
        window.location = '/download';
    }

    function exportDataDecrypted() {
        window.location = '/download-decrypted';
    }

    function createNewEntry(id) {
        groupId = id;
        $('#entry-heading').html('Create entry');
        createEntry();
    }

    function createEntry() {

        if (!groupId) return;

        entryId = undefined;
        $('#title').val('');
        $('#userName').val('');
        $('#email').val('');
        $('#password').val('');
        $('#other').val('');

        $('#addEntry').show();
        $('#updateEntry').hide();
        $('#removeEntry').hide();
        $('#group-container').hide();
        $('#entry-container').show();
        $('#entries').hide();
        $('#title').focus();
    }

    function addEntry() {

        if (!groupId) return;

        var entry = {
            title: $('#title').val().trim(),
            userName: $('#userName').val(),
            email: $('#email').val(),
            password: $('#password').val(),
            other: $('#other').val(),
            groupId: groupId
        }

        if (entry.title.length == 0) {
            alert('You must enter a title!');
            return;
        }

        $.ajax({
            type: "POST",
            url: '/addEntry',
            dataType: 'json',
            async: true,
            data: entry,
            success: function () {

                $('#entry-container').hide();
                getGroups();
                $('#entries').show();

            }
        });
    }

    function getEntry(currentGroupId, id) {

        groupId = currentGroupId;

        id = id.trim();

        $.ajax({
            type: "GET",
            url: '/getEntry/' + groupId + '/' + id,
            dataType: 'json',
            async: true,
            success: function (entry) {

                entryId = id;

                $('#title').val(entry.title);
                $('#userName').val(entry.userName);
                $('#email').val(entry.email);
                $('#password').val(entry.password);
                $('#other').val(entry.other);

                $('#entry-heading').html('Edit entry');

                $('#addEntry').hide();
                $('#updateEntry').show();
                $('#removeEntry').show();
                $('#entry-container').show();
                $('#entries').hide()
                $('#title').focus();
            }
        })

    }

    function updateEntry() {

        if (!groupId) return;
        if (!entryId) return;

        // if (!confirm("Are you sure you want to update this entry!"))
        //     return;

        var entry = {
            id: entryId,
            title: $('#title').val().trim(),
            userName: $('#userName').val(),
            email: $('#email').val(),
            password: $('#password').val(),
            other: $('#other').val()
        }

        if (entry.title.length == 0) {
            alert('You must enter a title!');
            return;
        }

        $.ajax({
            type: "POST",
            url: '/updateEntry/' + groupId + '/' + entryId,
            dataType: 'json',
            async: true,
            data: entry,
            success: function () {

                $('#entry-container').hide();
                getGroups();
                $('#entries').show();
            }
        });
    }

    function removeEntry() {

        if (!groupId) return;
        if (!entryId) return;

        if (!confirm("Are you sure you want to delete this entry!"))
            return;

        $.ajax({
            type: "POST",
            url: '/removeEntry/' + groupId + '/' + entryId,
            dataType: 'json',
            async: true,
            success: function () {

                $('#entry-container').hide();
                getGroups();
                $('#entries').show();
            }
        })
    }

    function cancelEntry() {

            $('#entry-container').hide();
            getGroups();
            $('#entries').show();
    }

    entryManager.getEntry = getEntry;
    entryManager.getGroup = getGroup;
    entryManager.createNewEntry = createNewEntry;

});