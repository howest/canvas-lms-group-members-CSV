const groupsHandler = (function groupsHandler()
{
    /**
     * Process a csv file and try to add/edit the group members in the file
     * @param input
     * @param dialogID
     * @param callback
     */
    function processCSV(input, dialogID, callback)
    {
        csvHandler.setValidHeaders(['groep', 'email']);
        //fetch course ID
        let courseID = lmsENV.getCurrentCourse();
        //fetch users and groups
        let pUsers = apiCourse.getCourseUsers(courseID);
        let pGroups = apiGroups.getGroups(courseID);
        //prepare to read csv file
        let reader = new FileReader();
        reader.readAsText(input.files[0]);
        reader.onload = function(e) {
            groupsDialog.setLoading(dialogID, true);
            Promise.all([
                pGroups.catch(function(e) { groupsDialog.errorMsg(dialogID, e.message);}),
                pUsers.catch(function(e) { groupsDialog.errorMsg(dialogID, e.message);})
            ]).then(function(values) {
                //process csv lines after the groups and users are fetched
                let lines = csvHandler.read(e.target.result);
                if (lines && lines.length > 0) {
                    //get groups and members IDs
                    let groups = findGroupMembers(lines, values[0], values[1]);
                    if (groups != null && groups.members != null) {
                        //send requests to add or edit group members
                        let requests = callback(groups.members);
                        if (requests.length > 0) {
                            handleRequests(requests, groups, dialogID);
                        } else {
                            throw new Error('There was a problem processing the request');
                        }
                    } else {
                        throw new Error('None of the groups or of the users in the CSV file could be found in the course');
                    }
                }
            }).catch(function(e) {
                groupsDialog.setLoading(dialogID, false);
                groupsDialog.errorMsg(dialogID, e.message);
            });
        };
    }

    /**
     * Given an array with group names and user emails, find their respective group and user ids,
     * then return an array of group ids and member ids
     * @param lines
     * @param lmsGroups
     * @param lmsUsers
     * @returns {{members: {}, error: *}}
     */
    function findGroupMembers(lines, lmsGroups, lmsUsers)
    {
        let members = {};
        let userErrors = [];
        let groupErrors = [];
        lines.forEach(function(line) {
            if (line && line['groep'] != '' && typeof line['groep'] != 'undefined' && line['email'] != '' && typeof line['email'] != 'undefined') {
                //find group id
                let group = findGroup(line['groep'], lmsGroups);
                if (group && group.id) {
                    if (!members[group.id]) {
                        members[group.id] = [];
                    }
                    //find user id
                    let user = findUser(line['email'], lmsUsers);
                    if (user && user.id) {
                        members[group.id].push(user.id);
                    } else {
                        if (userErrors.indexOf(line['email']) === -1) {
                            userErrors.push(line['email']);
                        }
                    }
                } else {
                    if (groupErrors.indexOf(line['groep']) === -1) {
                        groupErrors.push(line['groep']);
                    }
                }
            }
        });

        //prepare error messages
        let error = getGroupsErrorMessage(groupErrors, userErrors);

        return { members: members, error: error };
    }

    /**
     * Find a user by email
     * @param email
     * @param users
     * @returns {*}
     */
    function findUser(email, users)
    {
        for (let user of users) {
            if (typeof email !== 'undefined' && user.email && email.trim().toLowerCase() == user.email.trim().toLowerCase()) {
                return user;
            }
        }

        return false;
    }

    /**
     * Find a group by name
     * @param name
     * @param groups
     * @returns {*}
     */
    function findGroup(name, groups)
    {
        for (let group of groups) {
            if (typeof name !== 'undefined' && name.trim().toLowerCase() == group.name.trim().toLowerCase()) {
                return group;
            }
        }

        return false;
    }

    /**
     * Return an array of promises to edit the members of multiple groups
     * @param members
     * @returns {Array}
     */
    function editMembers(members)
    {
        let requests = [];
        for (let [groupID, userIDs] of Object.entries(members)) {
            if (groupID > 0 && userIDs.length > 0) {
                requests.push(apiGroups.editGroupMembers(groupID, userIDs));
            }
        }

        return requests;
    }

    /**
     * Return an array of promises to add multiple members in multiple groups
     * @param members
     * @returns {Array}
     */
    function addMembers(members)
    {
        let requests = [];
        for (let [groupID, userIDs] of Object.entries(members)) {
            if (groupID > 0) {
                userIDs.forEach(function(userID) {
                    requests.push(apiGroups.addGroupMember(groupID, userID));
                });
            }
        }

        return requests;
    }

    /**
     * Handle the result from the requests that add or edit members
     * @param requests
     * @param groups
     * @param dialogID
     */
    function handleRequests(requests, groups, dialogID)
    {
        Promise.all(
            requests.map(async (p) => await p.catch(e => new Error(e.responseText)))
        ).then(function(values) {
            let errors = values.filter(values => values instanceof Error);
            if (errors.length === 0) {
                if (groups.error) {
                    throw new Error(groups.error.message);
                } else {
                    location.reload(); //everything ok, reload the page
                }
            } else {
                throw new Error(getRequestsErrorMessage(errors));
            }
        }).catch(function(e) {
            //there were some errors, but some requests might have been processed
            groupsDialog.setLoading(dialogID, false);
            groupsDialog.errorMsg(dialogID, e.message);
        });
    }


    /**
     * Create an Error based on a list of not found users and/or groups
     * @param groupErrors
     * @param userErrors
     * @returns {*}
     */
    function getGroupsErrorMessage(groupErrors, userErrors)
    {
        let error = null;
        if (groupErrors.length > 0 || userErrors.length > 0) {
            let message = '';
            if (groupErrors.length > 0) {
                message += 'Groups not found: ' + groupErrors.join(', ') + '\n';
            }

            if (userErrors.length > 0) {
                message += 'Users not found: ' + userErrors.join(', ');
            }

            error = new Error(message);
        }

        return error;
    }

    /**
     * Create one error message from multiple instances of Error
     * @param errors
     * @returns {string}
     */
    function getRequestsErrorMessage(errors)
    {
        let message = 'There were some errors while processing the file. Please try again later.' + '\n';
        errors.forEach(function(e) {
            if (e.message) {
                let item = JSON.parse(e.message);
                message += '\n' + item.errors[0].message;
                message += ' (error report id: ' + item.error_report_id + ')';
            }
        });

        return message;
    }

    return {
        processCSV: processCSV,
        addMembers: addMembers,
        editMembers: editMembers
    };
})();




