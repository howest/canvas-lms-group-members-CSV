const groupsDialog = (function groupsDialog()
{
    function createDialogs()
    {
        createDialog('add-members',
            'Voeg Studenten toe',
            'Voeg studenten en groepen toe aan de bestaande groepenreeksen. Met deze actie voegt u studenten toe, u overschrijft de bestaande data niet.',
            '<i class="icon-plus"></i> Studenten');

        createDialog('edit-members',
            'Verander Samenstelling Groepen',
            'Met deze actie verander je de groepensamenstelling. Deze actie overschrijft de bestaande data en dit voor alle klasgroepenreeksen.',
            '<i class="icon-edit"></i> Groepen');
    }

    function createDialog(id, title, description, openBtn)
    {
        let dialog = new ModalDialog(id);
        let content = '<p>' +  description + '</p>' +  getExample();
        dialog.createOpenDialogBtn(openBtn, document.getElementById('group_categories_tabs').getElementsByClassName('group-categories-actions')[0]);
        dialog.createDialog(title, content, getActionBtn('btn-' + id));
    }

    function getExample()
    {
        return '<b>Voorbeeld CSV:</b>'
            + '<div style="background-color: #f8f9fa; margin: 10px;">'
            + '<span style="display: block; font-style: italic; font-weight: bold;">groep; email</span>'
            + '<span style="display: block; font-style: italic;">Groep 1; student1@student.howest.be</span>'
            + '<span style="display: block; font-style: italic;">Groep 2; student2@student.howest.be</span>'
            + '</div>';
    }

    function getActionBtn(dialogID)
    {
        return '<a id="' + dialogID + '-upload-csv" style="margin-left:5px;" class="btn btn-primary">'
            + '<input type="file" id="' + dialogID + '" style="opacity: 0; position: absolute; top: 0; left: 0; cursor: pointer;">Upload CSV'
            + '</a>';
    }

    function setListener(dialogID, callback)
    {
        let input = document.getElementById('btn-' + dialogID);
        input.onchange = function(event) {
            groupsHandler.processCSV(input, dialogID, callback);
            input.value = ""; //workaround for handling same name files on change event
        };
    }

    function setLoading(dialogID, b)
    {
        let form = document.getElementById(dialogID + '-form-dialog');
        let spinner = document.getElementById(dialogID + '-spinner');
        if (b) {
            spinner.style.display = 'block';
            form.style.opacity = "0.3";
        } else {
            spinner.style.display = 'none';
            form.style.opacity = "";
        }

        [...form.getElementsByTagName('textarea')].forEach(formElement => formElement.disabled = b);
        [...form.getElementsByTagName('button')].forEach(formElement => formElement.disabled = b);
    }

    function errorMsg(dialogID, msg)
    {
        let p = $('#' + dialogID + '-alert');
        if (p.hasClass('alert-info')) {
            p.toggleClass('alert-info alert-error');
        }
        p.text("Error: " + msg);

        let max_length = 150;
        if (p.html().length > max_length) {
            var short_content   = p.html().substr(0,max_length);
            var long_content  = p.html().substr(max_length);
            p.html(short_content+'<a href="#" class="read_more"> ... show more</a>'+
                '<span class="more_text" style="display:none;">'+long_content+'</span>'+'<a href="#" class="read_less" style="display:none;"> show less</a>');
            p.find('a.read_more').click(function(event) {
                event.preventDefault();
                $(this).hide();
                $('.read_less').show();
                $(this).parents('.collapseMsg').find('.more_text').show();
            });

            p.find('a.read_less').click(function(event) {
                event.preventDefault();
                $(this).hide();
                $('.read_less').hide();
                $('.read_more').show();
                $(this).parents('.collapseMsg').find('.more_text').hide();

            });
        }

        p.show();
    }


    return {
        createDialogs: createDialogs,
        setLoading: setLoading,
        errorMsg: errorMsg,
        setListener: setListener
    };

})();