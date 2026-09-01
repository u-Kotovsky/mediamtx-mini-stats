const stats = new Map();
const args = new Map();

function get_args() {
    if (window.location.search.length < 1) return [];
    let args = window.location.search.split('?')[1].split('&');
    let data = []

    args.forEach(arg => {
        let dat = arg.split('=')
        data.push({
            key: dat[0],
            value: dat[1]
        });
    })

    return data;
}

function write_args() {
    let _args = get_args();

    _args.forEach(arg => {
        args.set(arg.key, arg.value)
    })
}

write_args();

function isSafeMode() {
    return args.get('safemode') == 'true'
}

class PrettyArrayDataBuilder {
    parent = null;
    data = []

    constructor(parent) {
        this.parent = parent;
    }

    addField(name, value) { 
        this.data.push({ name, value }) 
    }

    build() {
        if (this.parent == null) throw 'parent is null'
        let li = document.createElement('li')

        this.data.forEach(data => {
            let element_parent = document.createElement('div')
            element_parent.className = 'parameter-root'

            let element_name = document.createElement('a')
            element_name.textContent = fallback(data.name, '-')
            element_parent.appendChild(element_name)
    
            let element_value = null;
            if (data.button) {
                /*element_value = document.createElement('a')
                let btn = document.createElement('button')

                element_value.textContent = fallback(data.value, '-')
                element_value.className = 'list-text-value'*/
            } else {
                element_value = document.createElement('div')
                element_value.textContent = fallback(data.value, '-')
                element_value.className = 'list-text-value'
            }
            element_parent.appendChild(element_value)
            
            li.appendChild(element_parent)
        });

        this.parent.appendChild(li)
    }

    reset(parent_reset = false) {
        if (parent_reset) this.parent = null;
        this.data = [];
    }
}

async function load(url) {
    try {
        const response = await fetch(url)
        if (!response.ok) throw new Error(response.status)
        const json = await response.json()
        return json;
    } catch (error) {
        //throw error;
    }
}

const fallback = (value, fallback_value) => value == null || value == undefined || value == 0 || value == 0.00 || `${value}`.startsWith('0.00') ? fallback_value : value

/*function fallback(value, fallback_value) {
    if (value == null || value == undefined || value == 0 || value == 0.00 || `${value}`.startsWith('0.00')) return fallback_value
    return value
}*/

function bytes_to_human_text(bytes) {
    let p1 = Math.pow(2, 10)
    if (bytes < p1) return `${(bytes).toFixed(2)} B`
    let p2 = Math.pow(2, 20)
    if (bytes < p2) return `${(bytes/p1).toFixed(2)} KB`
    let p3 = Math.pow(2, 30)
    if (bytes < p3) return `${(bytes/p2).toFixed(2)} MB`
    return `${(bytes/p3).toFixed(2)} GB`
}

function clear_list() {
    const elements = document.getElementsByTagName('ul')
    if (elements.length != 0) elements[0].remove()
}

function am_loading_here() {
    clear_list()
    const document_list = document.createElement('ul')
    const builder = new PrettyArrayDataBuilder(document_list)

    builder.addField('Loading response..', '')
    builder.build()
    
    document.body.appendChild(document_list)
}

function am_breaking_here() {
    clear_list()
    const document_list = document.createElement('ul')
    const builder = new PrettyArrayDataBuilder(document_list)

    builder.addField('Failed to get response from server :(', '')
    builder.build()
    
    document.body.appendChild(document_list)
}

function build_stream_data(data) {
    clear_list()
    const document_list = document.createElement('ul')
    let i = 0;
    data.items.forEach(stream => {
        const builder = new PrettyArrayDataBuilder(document_list)

        let _stats = {
            id: stream.source.id,
            max_readers: stream.readers.length
        }

        if (stats.has(stream.source.id)) {
            _stats = stats.get(stream.source.id)
            if (stream.readers.length > _stats.max_readers) _stats.max_readers = stream.readers.length
        }
        stats.set(_stats.id, _stats)

        //builder.addField('===== stream #' + i, '=====')
        builder.addField('name', `(${i}) ` + stream.name)
        builder.addField('confName', stream.confName)
        //builder.addField('ready', stream.ready)
        builder.addField('readyTime', stream.readyTime)
        builder.addField('tracks', `${stream.tracks}`.replaceAll(',', ', '))
        builder.addField('bytes in/out', `${bytes_to_human_text(stream.bytesReceived)} / ${bytes_to_human_text(stream.bytesSent)}`)
        //builder.addField('bytes in', bytes_to_human_text(stream.bytesReceived))
        //builder.addField('bytes out', bytes_to_human_text(stream.bytesSent))
        builder.addField('readers', `${stream.readers.length}/${_stats.max_readers}`)
        if (!isSafeMode())
            builder.addField('source id', stream.source.id)
        builder.addField('source type', stream.source.type)
        //builder.addField('actions', `<button>Kick</button>`)
        builder.build()

        i++
    });

    if (i == 0) {
        const builder = new PrettyArrayDataBuilder(document_list)

        builder.addField('We have no streams alive :(', '')
        builder.build()
    }
    document.body.appendChild(document_list)
}

async function load_paths_list() {
    try {
        am_loading_here();
        let hostname = args.get('hostname') == undefined ? 'localhost' : args.get('hostname')
        let port = args.get('port') == undefined ? '9997' : args.get('port')
        const data = await load(`http://${hostname}:${port}/v3/paths/list`)//http://localhost:9997/v3/recordings/list
        build_stream_data(data)
    } catch (error) { // failed to load
        am_breaking_here();
    }
    /**
itemCount, items [ bytesReceived, bytesSent, confName, name, readers [ { id type(rtspSession) } ], ready, readyTime, source { id type }, tracks [ '' '' ],], pageCount
    */
}


load_paths_list();

setInterval(() => {
    if (document.hidden) return;
    load_paths_list()
}, 10000)