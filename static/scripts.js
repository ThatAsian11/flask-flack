// Connecting the web socket
var socket = io.connect('http://' + document.domain + ':' + location.port);
$(function () {
  $('[data-toggle="tooltip"]').tooltip()
})

// Allows user to temprarily hide their own messages
const hide_message = e => {
  console.log("hide button clicked");
  item = e.parentNode.parentNode;
  list = document.querySelector('#messages');
  hide_item = document.getElementById(item.id)
  if (myStorage.getItem('savedUser') == e.dataset.user) {
    list.removeChild(hide_item);
  }
  else {
    socket.emit("problem", "You can only hide your own messages!");
  }
};
// Add a message to the message board
const add_message = (id, time, user, message) => {
  let messageArea = $("#messages");
  // let current_user = myStorage.getItem('savedUser');
  messageArea.append(`
  <div href="#" id="${id}" class="list-group-item list-group-item-dark mt-1 rounded h-25">
    <div class="d-flex w-100 bd-highlight">
      <p class="mb-1 flex-grow-1 bd-highlight text-secondary">${user}</p>
      
      <small class="text-muted bd-highlight mt-1 mr-1">${time}</small>
      <button type="button" class="close bd-highlight" onclick='hide_message(this)' data-user=${user} aria-label="Close" data-toggle="tooltip" data-placement="top" title="Hide Message">
        <span aria-hidden="true">&times;</span>
      </button>
    </div>
    <br>
    <h5 class="mb-1 pl-2 lead">${message}</h5>
  </div>
  `);
  // if (user == current_user) {
  //   messageArea.append(`
  //   <li id="${id}" class="list-group-item list-group-item-dark active"><small>${time}</small> | <strong>${user}</strong> : ${message}</li>
  // `)
  // }
  // else {
  //   messageArea.append(`
  //   <li id="${id}" class="list-group-item list-group-item-dark"><small>${time}</small> | <strong>${user}</strong> : ${message}</li>
  // `)
  // };
};

document.addEventListener('DOMContentLoaded', () => {
  
  // Setting up local storage in browser
  myStorage = window.localStorage;

  // Used for testing purposes
  // myStorage.clear();

  window.onload = function(){
    // Fill in form with previously entered name if username is in local storage
    if(myStorage.getItem('savedUser')) {
      prev_name = myStorage.getItem('savedUser');
      console.log(prev_name);
      document.getElementById("username_submit").value = `${prev_name}`;
    }

    // Automaticall select previously selected channel if saved in local storage
    if(myStorage.getItem('savedChannel')) {
      // let channelArea = document.querySelector("#channels");
      // if (channelArea.hasChildNodes()) {
        console.log("passed");
        prev_channel = myStorage.getItem('savedChannel')
        document.querySelector("#channel_name").innerHTML = `${prev_channel}`;
      // }
      
    }
    else {
      // Else disable message field because channel has to be selected first
       document.getElementById("message_submit").disabled = true;
     };

    // Add new username when entered
    document.querySelector('#username_entry').onsubmit = () => {
      username = document.querySelector('#username_submit').value;
      // Don't let username entry be blank
      if(username !== '') {
        myStorage.setItem('savedUser', username);
        socket.emit("username_enter", username);
        socket.emit("get_users");
        // Remove overlay when username has been submitted
        document.getElementById("username_overlay").style.display = "none";
        return false;

      }
      else {
        socket.emit("error", "Please enter a username");
        return false;
      };
      
    };

    // Get all existing channels and fill list of channels
    socket.emit("get_channels");
    socket.on('channels_all', channels => {
      var list = document.querySelector('#channels');
      var channel_data = channels;
      for (var i = 0; i < channel_data.length; i++) {
            var opt = channel_data[i];
            var el = document.createElement('option');
            el.textContent = opt;
            el.value = opt;
            list.appendChild(el);
        };

      // Auto select previously selected channel
      for (var x = 0; x < channel_data.length; x++) {
        var opt = channel_data[x];
        if(opt == myStorage.getItem('savedChannel')) {
          list.options[x].selected = true;
          socket.emit('get_messages', myStorage.getItem('savedChannel'))
          return;
        }
      }
      });

    // Get all users and list them
    socket.on('users_all', users => {
      // var list = document.querySelector('#users');
      let list = $("#users");
      current_user = myStorage.getItem("savedUser");
      let user_data = users;
      for (var i = 0; i < user_data.length; i++) {
          if (user_data[i] == current_user) {
            list.append(`<li class="list-group-item active">${user_data[i]}</li>`);
          }
          else {
            list.append(`<li class="list-group-item">${user_data[i]}</li>`);
          };
        };
    });

    // Get input of user's channel entry
    document.querySelector('#channel_create').onsubmit = () => {
        channel = document.querySelector('#create_channel').value;
        // Don't let channel entry be blank
        if(channel !== '') {
          socket.emit("channel_creation", channel);
          document.querySelector('#create_channel').value = '';
          return false;
        }
        else {
          socket.emit('error', "Type what you want your channel to be named!");
          return false;
        }
    };

    // Add new channel to list of options
    socket.on('channel_added', channel => {
      var list = document.querySelector('#channels');
      var channel_data = channel
      var opt = channel_data;
      var el = document.createElement('option');
      el.textContent = opt;
      el.value = opt;
      list.appendChild(el);
      });

    // Get channel pick if user changes selection
    var choice = document.getElementById('channels');
    choice.addEventListener("change", () => {
      channel = document.querySelector('#channels').value;
      document.querySelector("#channel_name").innerHTML = `<em>${channel}</em>`;
      myStorage.setItem('savedChannel', channel);
      document.getElementById("message_submit").disabled = false;
      var list = document.getElementById("messages");
      // clear messages area when channel changed
      while (list.hasChildNodes()) {
        list.removeChild(list.firstChild);
      }
      socket.emit('get_messages', channel);
      });

    // Get input of new message
    document.querySelector('#new_message').onsubmit = () => {
        // Send the message, user, channel and time to server
        msg = document.querySelector("#message_submit").value;
        if (msg !== '') {
        user = myStorage.getItem('savedUser');
        const channel = myStorage.getItem('savedChannel');
        socket.emit('new_message',{'msg': msg, 'user': user, 'channel': channel});
        document.querySelector("#message_submit").value = '';
        return false;
        } else {
          socket.emit('error', "Type something to send a message!");
          return false;
        }
    };

    // Add new message with a numbered id
    socket.on('announce message', content => {
      check = document.getElementById('messages').hasChildNodes();
      // Add the message with the appropriate id
      if (!check) {
        add_message(0, content.my_time, content.user, content.msg);
      }
      else {
        ul = document.getElementById('messages');
        x = parseInt(ul.lastElementChild.id);
        add_message(x + 1, content.my_time, content.user, content.msg);
      }
    });

    // Get all existing messages for channel and list them
    socket.on('broadcast messages', content => {
        channel = myStorage.getItem('savedChannel')
        for(var i = 0; i < content[channel].length; i++){
            // Add the message to the board
            add_message(i, content[channel][i].my_time, content[channel][i].user, content[channel][i].msg);
        }
    });

    // Error alert
    socket.on('error', problem => {
      alert(problem);
    });
    };
});
