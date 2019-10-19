import os
import time
import json

from flask import Flask, render_template, request
from flask_socketio import SocketIO, emit

# Use /python3 application.py/ to run

app = Flask(__name__)
app.config["SECRET_KEY"] = os.getenv("SECRET_KEY")
socketio = SocketIO(app, async_mode = None)
# Ensure templates are auto-reloaded
app.config["TEMPLATES_AUTO_RELOAD"] = True

@app.after_request
def after_request(response):
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    response.headers["Expires"] = 0
    response.headers["Pragma"] = "no-cache"
    return response


users = []
channels = []
my_messages = {}
#messages = {'channel': [('timestamp','displayname', 'content')]}

@socketio.on("username_enter")
def username_entered(username):
    """Get entered username and add to list of users"""
    if username not in users:
        users.append(username)

@socketio.on("get_users")
def get_users():
    """Get all users and send to site"""
    all_users = users
    emit("users_all", all_users)

@socketio.on("get_channels")
def get_channels():
    """Get all channels and send to site"""
    all_channels = channels
    emit("channels_all", all_channels)

@socketio.on("channel_creation")
def channel(channel):
    """Add a new channel to list of channels"""
    # Do not let used channel name be used again
    if channel in channels:
        problem = "That channel name aleady exists"
        emit("error", problem)
    else:
        # Creat channel key in my_messages
        my_messages[channel] = []
        channels.append(channel)
        data = {"channel": channel, "messages": my_messages[channel]}
        emit("channel_added", channel)
        emit("broadcast messages", data)

@socketio.on("new_message")
def sent_message(json):
    """Handle a new message being sent"""
    # Log the timestamp
    my_time = time.strftime('%H:%M:%S on %d/%m/%y')
    # Assemble data into a dict
    my_data = {"user": json["user"], "msg" : json["msg"], "my_time": my_time}
    # Add data to the messages of the channel
    my_messages[json["channel"]].append(my_data)
    # Store only the 100 most recent messages per channel
    if len(my_messages[json["channel"]]) > 100:
    	my_messages[json["channel"]].pop(0)
    # Pass the timestamp, message and username to the template
    emit("announce message", my_data)

@socketio.on("get_messages")
def all_messages(channel):
    if channel in my_messages:
        data = my_messages
        emit("broadcast messages", data)

@app.route("/")
def index():
    return render_template("index.html")

if __name__ == "__main__":
	socketio.run(app, debug = True)
