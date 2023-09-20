const express = require('express');
const cors = require('cors');
const axios = require('axios');
const querystring = require('querystring');
const cookieParser = require('cookie-parser');

require('dotenv').config()

const app = express();

// const client_id = 'd03c2c35d2e54815b9ebbf9fbe6dfe6b';
// const client_secret = 'c7ffeb4a915c49a88c309b96f0ab73d3';

const client_id = process.env.CLIENT_ID;
const client_secret = process.env.CLIENT_SECRET;

const redirect_uri =
  'http://localhost:3000/callback';

app.use(express.static(__dirname + '/public'))
  .use(cookieParser())
  .use(cors())


// app.use((req, res, next) => {
//   res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
//   res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
//   next();
// });

const genRandomString = (len) => {
  let text = '';
  let options =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for (let i = 0; i < len; i++) {
    text += options.charAt(Math.floor(Math.random() * options.length));
  }
  return text;
};

const stateKey = 'spotify_auth_state';

app.get('/login', (req, res) => {
  const state = genRandomString(16);
  res.cookie(stateKey, state);

  const scope = 'user-read-private user-read-email';

  res.redirect(
    'https://accounts.spotify.com/authorize?' +
      querystring.stringify({
        response_type: 'code',
        client_id: client_id,
        scope: scope,
        redirect_uri: redirect_uri,
        state: state,
      })
  );
});

app.get('/callback', async (req, res) => {
  // the app requests refresh and access tokens
  const code = req.query.code || null;
  const state = req.query.state || null;
  const storedState = req.cookies ? req.cookies[stateKey] : null;

  res.clearCookie(stateKey);
  const authOptions = {
    method: 'post',
    url: 'https://accounts.spotify.com/api/token',
    data: querystring.stringify({
      code: code,
      redirect_uri: redirect_uri,
      grant_type: 'authorization_code',
    }),
    headers: {
      Authorization:
        'Basic ' +
        Buffer.from(client_id + ':' + client_secret).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  };

  try {
    const authResponse = await axios(authOptions);
    const access_token = authResponse.data.access_token;
    const refresh_token = authResponse.data.refresh_token;
    console.log('access_token', access_token);
    res.cookie('access_token', access_token);
    res.cookie('refresh_token', refresh_token);

    res.redirect(
      '/#' +
        querystring.stringify({
          access_token: access_token,
          refresh_token: refresh_token,
        })
    );
  } catch (error) {
    console.log(error);
    console.log('error');
  }
});

app.get('/refresh_token', async (req, res) => {
  const refresh_token = req.cookies.refresh_token;

  const authOptions = {
    method: 'post',
    url: 'https://accounts.spotify.com/api/token',
    data: querystring.stringify({
      grant_type: 'refresh_token',
      refresh_token: refresh_token,
    }),
    headers: {
      Authorization:
        'Basic ' +
        Buffer.from(client_id + ':' + client_secret).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  };

  try {
    const authResponse = await axios(authOptions);
    const access_token = authResponse.data.access_token;
    console.log('new access_token', access_token);
    res.cookie('access_token', access_token);
    res.redirect('/');
  } catch (error) {
    console.log(error);
  }
});

app.listen(3000, () => console.log('SERVER on 3000'));
