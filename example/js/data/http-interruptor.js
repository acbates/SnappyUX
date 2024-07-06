const data = window.CONSPIRACY_DATA;


/**
 * HACKING, this is a HTTP interruptor.
 * It replaces the framework's http call function to simulate a service call.
 * Data in the 'data.js' file.
 */
const API = {
    
    searchConspiracies: async ({ offset, limit }) => {
        // get a selection from the data array (do not mutate the array) using offset and limit...
        return data.slice(offset, offset + limit);
    },
    
    getConspiracy: async ({conspiracyId}) => {
        conspiracyId = parseInt(conspiracyId);
        return data.find(c => c.id == conspiracyId);
    },
    
    saveConspiracy: async (conspiracy) => {
        let foundConspiracy = data.find(c => c.id == conspiracy.id);
        if (foundConspiracy) {
            for (var key in foundConspiracy) delete foundConspiracy[key];
            Object.assign(foundConspiracy, conspiracy);
        }
        return { result: 'success' };
    }
}


// HACK: overriding the framework's http call function...
sux.http = async (url, method, postOrParams, headers) => {
    return API[url.substring(url.lastIndexOf('/') + 1)](postOrParams);
}

