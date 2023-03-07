class Message {
    constructor(type, data = {}, id = null) {
        this.type = type;
        this.data = data;
        this.id = id;
    }

    toJSON() {
        let message = {
            type: this.type,
            data: this.data,
        };

        if (this.id !== null) {
            message.id = this.id;
        }

        return JSON.stringify(message);
    }

    static deserialize(serializedMessage){
        const { type, data, id } = serializedMessage;
        const message = new Message(type, data);
        return message;
    }

    static add(data) {
        return new Message('add', data);
    }

    static remove(id) {
        return new Message('remove', {}, id);
    }

    static update(id, data) {
        return new Message('update', data, id);
    }

    static sync() {
        return new Message('sync');
    }
}

module.exports = Message;