$(window).load(function()
{
    if (pageCourseGroups.isCourseGroupsPage() && lmsENV.isTeacher()) {
        let actionsBar = pageCourseUsers.getActionsBar();
        if (typeof actionsBar != 'undefined') {
            //create dialogs
            groupsDialog.createDialogs();
            groupsDialog.setListener('add-members', groupsHandler.addMembers);
            groupsDialog.setListener('edit-members', groupsHandler.editMembers);
        }
    }
});