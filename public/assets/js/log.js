/* eslint-disable no-undef */
/* eslint-disable indent */
$().ready(() => {
    $.get('/api/user ').then((resp) => {
        if (resp.user.name != null) {
            $('#login ').hide();
            $('#logout ').show();
            $('a').on('click', function(event) {
                $(this).unbind(event);
            });

        } else {
            $('#login ').show();
            $('#logout ').hide();
            $('a').on('click', function(event) {
                event.preventDefault();
                // event.redirect("home.html");
                // redirect("home.html");
                window.location.href = '/appid/login';
            });
        }
    });
});