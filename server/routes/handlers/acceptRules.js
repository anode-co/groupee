
const acceptRules = (response, cb) => {
    cb();

    response.write(JSON.stringify({}));
    response.end();
};

export default acceptRules;
