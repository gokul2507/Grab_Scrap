/* eslint-disable indent */
/* eslint-disable max-len */


const express = require('express');
const path = require('path');
const session = require('express-session');
const passport = require('passport');
const bodyParser = require('body-parser');
const WebAppStrategy = require('ibmcloud-appid').WebAppStrategy;
const healthRoutes = require('./routes/health-route');
const swaggerRoutes = require('./routes/swagger-route');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const url = require('url');
const cheerio = require('cheerio');
const { google } = require('googleapis');
const fs = require('fs');
const multer = require('multer');
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, './public/uploads/');
    },
    filename: function(req, file, cb) {
        cb(null, file.originalname);
    },
});

// Init Upload
const upload = multer({
    storage: storage,
});
const { promisify } = require('util');
const unlinkAsync = promisify(fs.unlink);
const app = express();
// enable parsing of http request body
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
// appid init
app.use(session({
    secret: '123456',
    resave: true,
    saveUninitialized: true,
}));
app.use(passport.initialize());
app.use(passport.session());
passport.serializeUser(function(user, cb) {
    cb(null, user);
});
passport.serializeUser(function(user, cb) {
    cb(null, user);
});
passport.deserializeUser(function(obj, cb) {
    cb(null, obj);
});

passport.use(new WebAppStrategy({
    tenantId: '26c27c27-3462-4762-9c08-6bbba7f66de2',
    clientId: '706da04b-3852-4034-b110-03f4722ca00d',
    secret: 'NzI0MGFkNTEtODVhZC00YTY3LWI5YmItZDZlYjNlZGIwOWU2',
    oauthServerUrl: 'https://eu-gb.appid.cloud.ibm.com/oauth/v4/26c27c27-3462-4762-9c08-6bbba7f66de2',
    redirectUri: 'http://localhost:3001/home.html', // https: //grab-scrap.eu-gb.mybluemix.net/home.html' //  + CALLBACK_URL   s1 login=>[]
}));
app.get('/home.html', passport.authenticate(WebAppStrategy.STRATEGY_NAME, {
    successRedirect: '/home',
}));
// routes and api calls
app.use('/health', healthRoutes);
app.use('/swagger', swaggerRoutes);

// default path to serve up index.html (single page application)
app.all('', (req, res) => {
    // res.redirect('/hom');
    res.status(200).sendFile(path.join(__dirname, '../public', 'home.html'));
});

app.get('/appid/login', passport.authenticate(WebAppStrategy.STRATEGY_NAME, {
    successRedirect: '/home',
    forceLogin: true,
}));
app.get('/api/user', (req, res) => {
    try {
        res.json({
            user: {
                name: req.user.name,
                eamil: req.user.email,
            },
        });
    } catch (e) {
        res.json({
            user: {
                name: null,
                email: null,
            },
        });
    }
});

app.use(express.static('./public'));

app.get('/appid/logout', function(req, res) {
    WebAppStrategy.logout(req);
    res.redirect('/home');
    res.end();
});

app.get('/home', async function(req, res) {
    if (req.user !== undefined) {
        await adduserdetails(req);
    }
    var toadd = '';
    fs.readFile('public/prod.txt', 'utf8', async function(err, data) {
        if (err) throw err;
        let product_length = await getlength(1);
        if (product_length > 0) {
            var $ = cheerio.load(data);
            var em;
            if (req.user !== undefined)
                em = req.user.email;
            var details = await gethomeproducts(em, 6);
            for (let i = 0; i < details.length; i++) {
                $('.prod-01-title').html(details[i].pname);
                $('.prod-01-price').html(details[i].price);
                $('.prod-01-link').attr('href', 'description?code=' + details[i].uid);
                $('.prod-01-img').attr('src', 'https://lh3.googleusercontent.com/d/' + details[i].image);
                var temp = details[i].desc;
                var desc = temp.slice(0, Math.min(30, temp.length));
                temp = temp.slice(Math.min(30, temp.length));
                desc += '<br>' + temp.slice(0, Math.min(30, temp.length));
                temp = temp.slice(Math.min(30, temp.length));
                desc += '<br>' + temp.slice(0, Math.min(30, temp.length));
                desc = desc.replace('<br><br>', '<br>');
                $('.prod-01-desc').html(desc);

                toadd += $.html();
            }
        }
        fs.readFile('public/home.html', 'utf8', function(er, da) {
            if (er) throw er;
            var $ = cheerio.load(da);
            $('.addprod').html($('.addprod').html() + toadd);
            res.write($.html());
            res.end();
        });
    });
});
app.get('/products', function(req, res) {
    var toadd = '';
    if (req.user === undefined) {
        res.redirect('/home.html');
        res.end();
    } else {
        fs.readFile('public/prod.txt', 'utf8', async function(err, data) {
            if (err) throw err;
            let product_length = await getlength(1);
            if (product_length > 0) {
                var $ = cheerio.load(data);
                var em;
                if (req.user !== undefined)
                    em = req.user.email;
                var details = await gethomeproducts(em);
                for (let i = 0; i < details.length; i++) {
                    $('.prod-01-title').html(details[i].pname);
                    $('.prod-01-price').html(details[i].price + 'price');
                    $('.prod-01-img').attr('src', 'https://lh3.googleusercontent.com/d/' + details[i].image);
                    $('.prod-01-link').attr('href', 'description?code=' + details[i].uid);
                    var temp = details[i].desc;
                    var desc = temp.slice(0, Math.min(30, temp.length));
                    temp = temp.slice(Math.min(30, temp.length));
                    desc += '<br>' + temp.slice(0, Math.min(30, temp.length));
                    temp = temp.slice(Math.min(30, temp.length));
                    desc += '<br>' + temp.slice(0, Math.min(30, temp.length));
                    desc = desc.replace('<br><br>', '<br>');
                    $('.prod-01-desc').html(desc);
                    toadd += $.html();
                }
            }
            fs.readFile('public/products.html', 'utf8', function(er, da) {
                if (er) throw er;
                var $ = cheerio.load(da);
                $('.addprod').html($('.addprod').html() + toadd);
                res.write($.html());
                res.end();
            });
        });
    }
});


app.get('/description', async function(req, res) {
    if (req.user === undefined) {
        res.redirect('/home.html');
        res.end();
    }
    fs.readFile('public/description.html', 'utf8', async function(err, data) {
        if (err) throw err;
        var $ = cheerio.load(data);
        var code = url.parse(req.url, true).query;
        if (req.user !== undefined && code.code !== undefined && !await isvalid(code.code, req.user.email)) {
            var q = await getRow(1, 'uid', code.code);
            if (q == null) {
                res.redirect('/profile');
                res.end();
            }
            $('.prodname').html(q.pname);
            $('.price').html(q.price);
            $('.phone').html(q.contact);
            $('.email').html(q.email);
            $('.address').html(q.address);
            $('.desc').html(q.desc);
            $('.image').attr('src', 'https://lh3.googleusercontent.com/d/' + q.image);
            res.write($.html());
            res.end();
        } else {
            res.redirect('/products.html');
            res.end();
        }
    });
});

app.post('/add/product', upload.single('image2'), async function(req, res) {

    if (req.user === undefined) {
        res.redirect('/home');
        res.end();
    } else {
        var q = req.body;
        var today = new Date();
        var date = today.getFullYear() + '/' + (today.getMonth() + 1) + '/' + today.getDate();
        var time = today.getHours() + ':' + today.getMinutes() + ':' + today.getSeconds();
        var dateTime = date + ', ' + time;
        await appProduct(dateTime, q.product, q.price,
            q.street + ', ' + q.city + ', ' + q.state + ', ' + q.postal,
            q.phpno, q.Description, dateTime + q.product + q.price + req.user.email,
            req.user.email, req.file.filename);
        // delete here
        await unlinkAsync(req.file.path);
        res.redirect('/success');
        res.end();
    }

});
app.get('/success', async function(req, res) {
    if (req.user === undefined) {
        res.redirect('/home');
        res.end();
    } else {
        res.redirect('success.html');
        res.end();
    }
});
app.get('/profile', async function(req, res) {
    if (req.user === undefined) {
        res.redirect('/home');
        res.end();
    } else {
        fs.readFile('public/myproduct.txt', 'utf8', async function(er, da) {
            if (er) throw er;
            var $$ = cheerio.load(da);
            let toadd = '';
            let details = await getdetails(req.user.email);
            for (let index = 0; index < await details[1].length; index++) {
                let temp = await details[1][index];
                $$('.link').attr('href', 'description?code=' + temp.uid);
                $$('.title').html(await temp.pname);
                $$('.price').html(await temp.price);
                $$('.desc').html(await temp.desc);
                $$('.imglink').attr('src', 'https://lh3.googleusercontent.com/d/' + temp.image);
                // $$('.imglink').attr('src', await temp.image);
                $$('.editbut').attr('href', 'edit?code=' + await temp.uid);
                $$('.deletebut').attr('href', 'delete?code=' + await temp.uid);
                toadd += $$('body').html();
            }
            fs.readFile('public/profile.html', 'utf8', async function(err, data) {
                if (err) throw err;
                var $ = cheerio.load(data);
                $('.name').html(details[0].name);
                $('.comapany').html(details[0].company);
                $('.email').html(details[0].user_id);
                $('.address').html(details[0].address);
                $('.myproduct').html(toadd);
                $('.edit-profile').attr('href', '/profile-edit');
                res.setHeader('profile', 'text/html');
                res.write($.html());
                res.end();
            });

        });
    }
});
app.get('/profile-edit', async function(req, res) {
    if (req.user === undefined) {
        res.redirect('/home');
        res.end();
    } else {
        fs.readFile('public/editprofile.html', 'utf8', async function(err, data) {
            if (err) throw err;
            var $ = cheerio.load(data);
            let details = await getRow(0, 'user_id', req.user.email);
            $('.name').attr('value', details.name);
            if (details.company !== undefined)
                $('.company').attr('value', details.company);
            if (details.address !== undefined) {
                let address = details.address.split(', ');
                $('.street').attr('value', address[0]);
                $('.city').attr('value', address[1]);
                $('.state').attr('value', address[2]);
                $('.postal').attr('value', address[3]);
            }
            $('form').attr('action', '/update/user');
            res.write($.html());
            res.end();
        });
    }
});
app.get('/edit', async function(req, res) {
    if (req.user === undefined) {
        res.redirect('/home');
        res.end();
    } else {
        let code = url.parse(req.url, true).query;
        if (code.code === undefined) {
            res.redirect('/profile');
            res.end();
        } else {
            if (!await isvalid(code.code, req.user.email)) {
                res.redirect('/profile');
                res.end();
            } else {
                fs.readFile('public/edit.txt', 'utf8', async function(err, data) {
                    if (err) throw err;
                    var $ = cheerio.load(data);
                    let details = await getRow(1, 'uid', code.code);
                    $('.pname').attr('value', await details.pname);
                    $('.price').attr('value', await details.price);
                    $('.phone').attr('value', await details.contact);
                    $('.email').attr('value', await details.email);
                    let address = await details.address.split(', ');
                    $('.street').attr('value', await address[0]);
                    $('.city').attr('value', await address[1]);
                    $('.state').attr('value', await address[2]);
                    $('.postal').attr('value', await address[3]);
                    $('.desc').html(await details.desc);
                    $('.uid').attr('value', await details.uid);
                    $('.uid').attr('required', false);
                    $('form').attr('action', '/update/product');
                    res.write($.html());
                    res.end();
                });
            }
        }
    }
});
app.get('/update/product', async function(req, res) {
    if (req.user === undefined) {
        res.redirect('/home');
        res.end();
    } else {
        let code = url.parse(req.url, true).query;
        if (code.uid === undefined) {
            res.redirect('/profile');
            res.end();
        } else {
            if (!await isvalid(code.uid, req.user.email)) {
                res.redirect('/profile');
                res.end();
            } else {
                await update_product(code);
                res.redirect('/profile');
                res.end();
            }
        }
    }
});
app.get('/update/user', async function(req, res) {
    if (req.user === undefined) {
        res.redirect('/home');
        res.end();
    } else {
        let code = url.parse(req.url, true).query;
        await update_user(code, req.user.email);
        res.redirect('/profile');
        res.end();

    }
});
app.get('/delete', async function(req, res) {
    if (req.user === undefined) {
        res.redirect('/home');
        res.end();
    }
    var code = url.parse(req.url, true).query;
    if (await isvalid(code.code, req.user.email)) {
        await deleteFile(await deleteRow(code.code));
        res.redirect('/profile');
        res.end();
    } else {
        res.redirect('/profile');
        res.end();
    }

});
const port = process.env.PORT || 3001;
app.listen(port, async() => {
    await asd();
    console.log(`App UI available http://localhost:${port}`);
    console.log(`Swagger UI available http://localhost:${port}/swagger/api-docs`);
});

app.use((req, res, next) => {
    res.sendFile(path.join(__dirname, '../public', '404.html'));
});


/**
 *
 *
 *
 *  Google drive
 *
 *
 *
 *
 */
const CLIENT_ID = '65319538236-um5e5sphq51j05faurgf47kmgt2lljh3.apps.googleusercontent.com';
const CLIENT_SECRET = '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';
const REDIRECT_URI = 'https://developers.google.com/oauthplayground';
const REFRESH_TOKEN = '1//04Q-hJw9uQyNpCgYIARAAGAQSNwF-L9Irbj8ajYf-E9W2Cmla6foTM8BYEaHJXX-qqdn1c_dyCEIwgpXHRIDfJR6hXAvCTvgzLW8';

const oauth2Client = new google.auth.OAuth2(
    CLIENT_ID,
    CLIENT_SECRET,
    REDIRECT_URI,
);

oauth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });

const drive = google.drive({
    version: 'v3',
    auth: oauth2Client,
});

async function uploadFile(file, filename) {
    try {
        const response = await drive.files.create({
            requestBody: {
                name: filename, // This can be name of your choice
                parents: ['1lve6ZQ4Z8hoZL_9ewylTJ0XGJBQpZllS'],
                mimeType: 'image/*',
            },
            media: {
                mimeType: 'image/*',
                body: fs.createReadStream(file),
            },
        });
        return response.data.id;
    } catch (error) {
        console.log(error);
        return 'null';
    }
}

async function deleteFile(id) {
    if (id == null) {
        return null;
    }
    try {
        const response = await drive.files.delete({
            fileId: id,
        });
        console.log('at delete file' + response.data, response.status);
    } catch (error) {
        console.log('error at delete file' + error.message);
    }
}


/**
 *
 *
 *
 *  Google sheet
 *
 *
 *
 *
 */


const RESPONSES_SHEET_ID = '181v3y6mkAKk6HFAMRGereYo1SQWeUT_YYYb8pO04Zgw';


const CREDENTIALS = JSON.parse(fs.readFileSync('./cre.json'));
let isprocess = true;
const doc = new GoogleSpreadsheet(RESPONSES_SHEET_ID);
const asd = async() => {
    await doc.useServiceAccountAuth({
        client_email: CREDENTIALS.client_email,
        private_key: CREDENTIALS.private_key,
    });
    await doc.loadInfo();
};
const adduserdetails = async(req) => {
    var mail = req.user.email;
    let sheet = doc.sheetsByIndex[0];
    let rows = await sheet.getRows();
    for (let index = 0; index < rows.length; index++) {
        var temp = rows[index];
        if (temp.user_id === mail)
            return;
    }
    var row = [{
        user_id: mail,
        name: req.user.name,
        date: Date(),
    }];
    await sheet.addRow(row[0]);
};
const getlength = async(index) => {

    let sheet = doc.sheetsByIndex[index];
    let rows = await sheet.getRows();
    return rows.length;
};
const getdetails = async(email) => {
    let product_details = [];
    var user_details;
    let sheet1 = doc.sheetsByIndex[0];
    let rows = await sheet1.getRows();
    for (let index = 0; index < rows.length; index++) {
        let temp = rows[index];
        if (temp['user_id'] === email) {
            user_details = temp;
            break;
        }
    }
    let sheet2 = doc.sheetsByIndex[1];
    rows = await sheet2.getRows();
    for (let index = 0; index < rows.length; index++) {
        let temp = rows[index];
        if (temp['email'] === email) {
            product_details.push(temp);
        }
    }
    return [user_details, product_details];
};
const isvalid = async(code, email) => {
    let sheet = doc.sheetsByIndex[1];
    let rows = await sheet.getRows();
    for (let index = 0; index < rows.length; index++) {
        var temp = rows[index];
        if (temp['email'] === email && temp['uid'] === code)
            return true;

    }
    return false;
};
const gethomeproducts = async(email, len = null) => {

    let sheet = doc.sheetsByIndex[1];
    let rows = await sheet.getRows();
    var products = [];
    for (let index = rows.length - 1; index >= 0; index--) {
        var temp = rows[index];
        if (temp['email'] === email)
            continue;
        products.push(temp);
        if (len !== null && products.length > len)
            break;
    };
    return products;
};
const getRow = async(sheet_index, col, code) => {

    let sheet = doc.sheetsByIndex[sheet_index];
    let rows = await sheet.getRows();
    for (let index = 0; index < rows.length; index++)
        if (rows[index][col] === code)
            return rows[index];
    return null;
};
// delete here
const appProduct = async(time, prname, price, address, phone, desc, uid, email, filepath) => {

    var deta = await uploadFile('./public/uploads/' + filepath, filepath);
    let row = [{
        time: time,
        pname: prname,
        price: price,
        address: address,
        contact: phone,
        desc: desc,
        uid: uid,
        email: email,
        image: deta,

    }];
    let sheet = doc.sheetsByIndex[1];
    await sheet.addRow(row[0]);
};
const update_product = async(code) => {

    let sheet = doc.sheetsByIndex[1];
    let rows = await sheet.getRows();
    for (let index = 0; index < rows.length; index++) {
        const row = rows[index];
        if (row['uid'] === code.uid) {
            rows[index]['pname'] = code.product;
            rows[index]['price'] = code.price;
            rows[index]['contact'] = code.phpno;
            rows[index]['address'] = code.street + ', ' + code.city + ', ' + code.state + ', ' + code.postal;
            rows[index]['desc'] = code.Description;
            await rows[index].save();
            break;
        }
    };
};
const update_user = async(code, user_id) => {

    let sheet = doc.sheetsByIndex[0];
    let rows = await sheet.getRows();
    for (let index = 0; index < rows.length; index++) {
        const row = rows[index];
        if (row['user_id'] === user_id) {
            rows[index]['name'] = code.name;
            rows[index]['company'] = code.company;
            rows[index]['address'] = code.street + ', ' + code.city + ', ' + code.state + ', ' + code.postal;
            await rows[index].save();
            break;
        }
    };
};
const deleteRow = async(code) => {

    let sheet = doc.sheetsByIndex[1];
    let rows = await sheet.getRows();
    for (let index = 0; index < rows.length; index++) {
        const row = rows[index];
        if (await row['uid'] === code) {
            let imgid = await rows[index]['image'];
            await rows[index].delete();
            return imgid;
        }
    };
    return null;
};

// eslint-disable-next-line eol-last
module.exports = app;