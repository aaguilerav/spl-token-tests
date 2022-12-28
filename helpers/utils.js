const { URL } = require('url');

const isValidHttpUrl = (str) => {
    let url;
    try {
        url = new URL(str);
    } catch (ex) {
        return false;  
    }
    return url.protocol === 'http:' || url.protocol === 'https:';
}

module.exports = {
    isValidHttpUrl
}