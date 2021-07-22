
const isValidUserIdFormat = (userId) => {
    if (typeof userId !== 'string') {
        return false;
    }

    // A valid user id counts exactly 26 characters
    // and it contains only letters or numbers
    // @see https://github.com/thierrymarianne/contrib-matterfoss/blob/06b5ebb69b6c04d235da576d869e2e469223ccc9/model/utils.go#L558-L570
    // @see https://github.com/thierrymarianne/contrib-matterfoss/blob/06b5ebb69b6c04d235da576d869e2e469223ccc9/model/user.go#L263-L265
    return userId.length === 26
        && userId.split().every(c => new RegExp('[a-zA-Z0-9]').test(c));
};

export default isValidUserIdFormat;
