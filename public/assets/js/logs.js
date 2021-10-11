/* eslint-disable no-undef */
/* eslint-disable indent */
$().ready(() => {
    $.get('/api/user ').then((resp) => {
        // $("#user ").text("HI " + resp.user.name);
        if (resp.user.name != null) {
            $('#login ').hide();
            $('#logout ').show();
            $('a').on('click', function(event) {
                $(this).unbind(event);
            });

        } else {
            $('#login ').show();
            $('#logout ').hide();
            location.replace('http://grab-scrap.herokuapp.com/home');
            // https://grab-scrap.eu-gb.mybluemix.net/home.html');
            /* $('a').on('click', function(event) {
                event.preventDefault();
                // event.redirect("home.html");
                // redirect("home.html");
                window.location.href = '/appid/login';
            });*/
        }
    });
    // eslint-disable-next-line eol-last
});