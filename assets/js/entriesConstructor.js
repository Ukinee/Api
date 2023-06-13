(function () {

    const host = `http://192.168.0.105/`;
    const prefix = `api/`;
    const timeout = 10000;
    const {log} = console;

    window.addEventListener("DOMContentLoaded", async () => {
        const request = await fetch(`${host}${prefix}devices`);
        const response = await request.json();

        log(response)

        ConstructListOfEntries(response);
        setInterval(UpdateList, timeout)
    })

    function GetShareStatus(entry) {
        if (entry.Status) {
            return entry.Status.includes("shared");
        }
        
        return false;
    }

    function GetActiveStatus(entry) {
        if (entry.Status) {
            return !entry.Status.includes("not plugged");
        }
        
        return false;
    }

    function ConstructListOfEntries(devices) {
        let container = document.getElementById("entriesList");
        let skippedAmount = 0;

        for (let i = 0; i < devices.length; i++) {
            let device = devices[i];

            if (GetActiveStatus(device) === false) {
                skippedAmount++;
                continue;
            } 
            
            AddNewEntry(container, device, i - skippedAmount);
        }
    }

    function GetEntry(device, i, port) {
        let shareStatus = GetShareStatus(device) ? "checked" : "";

        return `
                <li class="entry row" device-id=${port}>
                    <div class="row">
                        <span class="index">${i + 1}. </span>
                        <label class="paddingLeft">
                            <input disabled type="text" maxlength="60" class="textField deviceName">
                        </label>
                        <label class="paddingLeft">
                            <input disabled type="text" maxlength="40" class="textField port">
                        </label>
                    </div>

                    <div class="row">
                        <label class="paddingLeft paddingRightSwitch">
                            <input type="checkbox" class="toggleShare" ${shareStatus}>
                        </label>

                        <label class="paddingLeft paddingRightToggle">
                            <input type="button" class="deactivate" >
                        </label>

                        <div class="paddingLeft">
                            <button class="button padding"> Изменить</button>
                        </div>
                    </div>
                </li>`
    }

    function OnEditPressed(node, device) {
        const field = node.querySelector(".textField.deviceName");
        let isEditing = field.disabled === false;

        if (isEditing === false) {
            StartEdit(node);
            this.initialValue = field.value;
        } else {
            const promise = EndEdit(node, device);

            promise.catch(onRejected => {
                log(onRejected);

                field.value = this.initialValue;
            })
        }
    }

    function StartEdit(node) {
        node.querySelector(".textField.deviceName").disabled = false;
        node.querySelector(".button").innerText = "Сохранить";
    }

    function OnShareUnsharePressed(node, device) {
        const checkbox = node.querySelector(".toggleShare");
        let currentStatus = checkbox.checked;

        let serial = device.Serial;
        let port = device.Port;

        let requestId = currentStatus ? "share" : "unshare";

        let promise = PrepareShareUnshareRequest(serial, port, requestId);

        promise.catch(onRejected => {
            log(onRejected);

            checkbox.checked = !currentStatus;
        })
    }

    function OnDeletePressed(node, entry) {
        let serial = entry.Serial;
        let port = entry.Port;

        PrepareDeleteRequest(serial, port);
    }

    function EndEdit(node, device) {
        let textNode = node.querySelector(".textField.deviceName");
        textNode.disabled = true;
        node.querySelector(".button").innerText = "Изменить";

        let name = textNode.value;
        let serial = device.Serial;
        let port = device.Port;
        let url = `${host}${prefix}device`;

        return SendRequest(url, {Name: name, Port: port}, "PUT");
    }

    function PrepareShareUnshareRequest(serial, port, requestId) {
        let url = `${host}${prefix}device/${requestId}`;
        
        return SendRequest(url, {Port: port});
    }

    function PrepareDeleteRequest(serial, port) {
        let url = `${host}${prefix}device/disconnect`;
        
        return SendRequest(url, {Port: port});
    }

    async function SendRequest(url, data, method = "POST") {

        log(`Sending request ${method} to ${url} with serial: ${data.Serial}, port: ${data.Port} and name: ${data.Name}`);
        return postData(url, data);

        async function postData(url, data) {

            const form_data = new FormData();

            for (const key in data)
                form_data.append(key, data[key])

            let response = await fetch(url, {method: method, body: form_data});
            log(response)

            return await response.json();
        }
    }

    async function UpdateList() {
        log("Автоматический запрос на обновление:");
        const request = await fetch(`${host}${prefix}devices`);
        let devices = await request.json();
        
        log(devices);

        let container = document.getElementById("entriesList");
        const cachedDevices = container.querySelectorAll("li");

        let index = 0;

        cachedDevices.forEach(node => {
            const id = node.getAttribute("device-id");
            const device = devices.find(device => device.Port === id);

            if (device) {
                index++;
                TryUpdateNode(node, device, index);

                const indexToRemove = devices.indexOf(device);
                devices.splice(indexToRemove, 1);

            } else {
                node.remove();
            }
        })

        devices.forEach(device => {
            AddNewEntry(container, device, index);
            index++;
        })
    }

    function AddNewEntry(container, device, index) {
        let stringNode = GetEntry(device, index, device.Port);
        container.insertAdjacentHTML(`beforeend`, stringNode)
        let node = container.querySelector(`li[device-id="${device.Port}"]`)

        node.querySelector(".toggleShare").addEventListener("click", OnShareUnsharePressed.bind(this, node, device));
        node.querySelector(".deactivate").addEventListener("click", OnDeletePressed.bind(this, node, device));
        node.querySelector(".button").addEventListener("click", OnEditPressed.bind(this, node, device));
        node.querySelector(".deviceName").value = device.Name;
        node.querySelector(".port").value = device.Port;
    }

    function TryUpdateNode(node, device, index) {
        const currentShareStatus = GetShareStatus(device);
        const currentName = device.Name;

        const nameNode = node.querySelector(".textField.deviceName");
        const shareNode = node.querySelector(".toggleShare");
        node.querySelector(".index").innerText = index + ".";

        const cachedName = nameNode.value;
        const cachedShareStatus = shareNode.checked;
        
        if(nameNode.disabled === false)
        {
            return;
        }

        if (cachedName !== currentName || cachedShareStatus !== currentShareStatus) {
            nameNode.value = currentName;
            shareNode.checked = currentShareStatus;
        }
    }
})();