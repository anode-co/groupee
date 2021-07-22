
const acceptRules = (response, cb, updatePost = {}) => {
    cb();

    response.writeHead(200, {"Content-Type": "application/json"});
    response.end(JSON.stringify(updatePost));
};

export default acceptRules;
