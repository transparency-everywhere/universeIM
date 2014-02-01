var sourceURL = 'http://universeos.org';
        var usernames = [];
        var realnames = [];
        var userPictures = [];
        
        var loadedMessages = [];
        
        var sendedMessagesContent = [];
        
        var lastMessageReceived = 0;
        var unseenMessages = 0;
        
        var openChatDialoges = [];
        var messageKeys = [];
        
        var privateKeys = [];
        var shownUsers = [];
        
        var avoidLoop = 0;
        
        var delay = (function(){
                var timer = 0;
                return function(callback, ms){clearTimeout (timer); timer = setTimeout(callback, ms);
            };
            })();
            
        //hide jquerymobile loading stuff and ajax
        
        
        
        
        
        function initApp(){
             
         
            
         $(document).ready(function(){
            
            if(isLogin()){
                
                
                $('#offline').hide(); //hide login and registration container
                
                //initalize search
                init.search();
                $('#storeMessageKeys').prop('checked', eval(localStorage.config_storeMessageKeys));

                $('#loader').show();
                
                //load and show buddylist
                getBuddylist(true, true);
                showBuddylist();
                
                //get open buddy requests
                getOpenRequests();
                
                //init reload
                reload();
                
                
            }else{
                
                $('#online').hide();
                $('#offline').show();
                $('#start').show();
                
                
            }
            
            //offline stuff
            $('#openReg').click(function(){
                $('.captcha').attr('src', sourceURL+'/inc/plugins/captcha/image.php?dummy='+ new Date().getTime());
                showRegistration();
            });
            $('#regBack').click(function(){
                showLogin();
            });

            $('#loginForm').submit(function(){
              login();
              event.preventDefault();
              
            });
            //registration
            
            $("#regUsername").keyup(function() {
                        delay(function(){
                          checkUsername('regUsername');
                        }, 500 );
            });

            $('#regForm').submit(function(){
              checkReg();
              event.preventDefault();
              
            });
            
            
        });
       }
       
       
       
       var app = {
    // Application Constructor
    initialize: function() {
        initApp();
        this.bindEvents();
    },
    // Bind Event Listeners
    //
    // Bind any events that are required on startup. Common events are:
    // 'load', 'deviceready', 'offline', and 'online'.
    bindEvents: function() {
        document.addEventListener('deviceready', this.onDeviceReady, false);
    },
    // deviceready Event Handler
    //
    // The scope of 'this' is the event. In order to call the 'receivedEvent'
    // function, we must explicity call 'app.receivedEvent(...);'
    onDeviceReady: function() {
//    if (parseFloat(device.version) >= 7.0) {
//          document.body.style.marginTop = "20px";
//          // OR do whatever layout you need here, to expand a navigation bar etc
//    }
    }
};

app.initialize();
        
        
        
        
	var hash = new function(){
		this.MD5 = function(string){
			var hash = CryptoJS.MD5(string);
			return hash.toString(CryptoJS.enc.Hex);
		}
		this.SHA512 = function(string){
			var hash = CryptoJS.SHA512(string);
			return hash.toString(CryptoJS.enc.Hex);
		}
	}
        
        function reload(){
            
            
            //define interval (mil sec)
            var interval = [];
            interval['messages'] = 3000;
            interval['buddyRequests'] = 180000;
            interval['buddylist'] = 60000;
            
            
            
            
            setInterval(function()
            {
                reloadDialoges();
            }, interval['messages']);
            
            
            //because it takes 180 seconds untill getOpenRequests() is called,
            //it will be triggered once, before the intervall starts so that
            //open friend requests will be loaded on startup
            getOpenRequests();
            
            setInterval(function()
            {
                getOpenRequests();
            }, interval['buddyRequests']);
            
            setInterval(function()
            {
                getBuddies();
            }, interval['buddylist']);
            
        }
        
        function updateConfig(type, value){
            
            if(type === 'storeMessageKeys'){
                if(value === true){
                //move keys from array to localStorage
                    
                    localStorage.storedMessageKeys = JSON.stringify(messageKeys);
                
                }else if(value === false){
                //move keys from localStorage to array
                    if(localStorage.storedMessageKeys){
                        var keys = $.parseJSON(localStorage.storedMessageKeys);
                        messageKeys = keys;
                    }
                }
                
                
                //update config string   
                localStorage.config_storeMessageKeys = value;
            }
            
            return true;
        }
        
              
        function jsAlert(type, message){
        	var alertClass;
        	if(empty(type)){
        		alertClass = 'alert-info';
        	}else if(type == 'success'){
        		alertClass = 'alert-success';
        	}else if(type == 'error'){
        		alertClass = 'alert-error';
        	}
        	
        	$('#alerter').append('<div class="alert '+alertClass+'"><button type="button" class="close" data-dismiss="alert">&times;</button>'+message+'</div>');
        	$('.alert').delay(5000).fadeOut(function(){
        		$(this).remove();
        	});
        }
        
        
        //encryption functions

	function symEncrypt(key, message){
            var msg;
            var output;
            msg = CryptoJS.AES.encrypt(message, key);
            return String(msg);
	}
	
	function symDecrypt(key, message){
            var msg;
	    msg = CryptoJS.AES.decrypt(message, key);
	    var output = CryptoJS.enc.Utf8.stringify(msg);
	    return String(output);
	}
	
	function generateAsymKeyPair(){
            var keySize = 1024;
            var crypt;
            var ret = [];
            crypt = new JSEncrypt({default_key_size: keySize});
            crypt.getKey();
            ret['privateKey'] = crypt.getPrivateKey();
            ret['publicKey'] = crypt.getPublicKey();

            return ret;
	}
        
        function getPrivateKey(type, itemId, salt){
            
	    var privateKey;
            var index = type+'_'+itemId;
            if(typeof privateKeys[index] === 'undefined'){
                console.log(index);
                    var encryptedKey = '';
			$.ajax({
			  url:sourceURL+"/api.php?action=getPrivateKey",
			  async: false,  
			  type: "POST",
			  data: { type : type, itemId : itemId },
			  success:function(data) {
			     encryptedKey = data; 
			  }
			});
		
			var password = localStorage.currentUser_passwordHashMD5;
			
		    var shaKey = CryptoJS.SHA512(password+salt);
		    var keyHash = shaKey.toString(CryptoJS.enc.Hex);
			
	    	privateKey = symDecrypt(keyHash, encryptedKey); //encrypt private Key using password
                privateKeys[index] = privateKey;
            }else{
                
                privateKey = privateKeys[index];
                
            }
	    return privateKey;
	}
        
        function getSalt(type, itemId, key){
			var encryptedSalt = '';
			$.ajax({
			  url:sourceURL+"/api.php?action=getSalt",
			  async: false,  
			  type: "POST",
			  data: { type : type, itemId : itemId },
			  success:function(data) {
			     encryptedSalt = data; 
			  }
			});
	    	var salt = symDecrypt(key, encryptedSalt); //encrypt salt using key
	    	return salt;
		
	}
	
	function getPublicKey(type, itemId){
		var key = '';
		$.ajax({
		url:sourceURL+"/api.php?action=getPublicKey",
		async: false,  
		type: "POST",
		data: { type : type, itemId : itemId },
		success:function(data) {
		key = data; 
		}
                });
	    	return key;
	}
        
	
	function asymEncrypt(publicKey, message){
		
            var encrypt = new JSEncrypt();
            encrypt.setPublicKey(publicKey);
            return encrypt.encrypt(message);
          
	}
        
	
	function asymDecrypt(privateKey, encryptedMessage){
            var message;
            var decrypt = new JSEncrypt();
            decrypt.setPrivateKey(privateKey);
            message = decrypt.decrypt(encryptedMessage);
            console.log(message);
            return message;
		
	}

        function searchUserByString(string, limit){
            var result = [];
            $.ajax({
              url:sourceURL+"/api.php?action=searchUserByString",
              async: false,  
              type: "POST",
              data: { string : string, limit : limit },
              success:function(data) {
                  
              var res = JSON.parse(data);
              if(res.length !== 0){
                
                $('.buddylist').hide();
                $('#openRequests').hide();
                $('#searchResult').show();
                $.each(res, function( index, value ) {
                     
                      if($('#searchResult_'+String(index)).length == 0){
                        var username = value[0];
                        var realname = value[1];
                        var userpicture = getUserPicture(index);
                        var addButton = '';
                        if($('#buddy_'+String(index)).length == 0){
                            
                            addButton = '<a href="#" onclick="sendFriendRequest(\''+index+'\');" class="btn btn-success pull-right" id="requestButton_'+index+'">add</a>';
                        
                        }
                        $('#searchResult').append('<li id="searchResult_'+String(index)+'"><div class="userPicture" style="background: url('+userpicture+');"></div><span class="username">'+username+'</span><br /><span class="realname">'+realname+'</span>'+addButton+'</li>');
                      }      


                });
                
              }
                  
                  
                  
                  
                  
                  
              }
            });
            return result;
        }
        var interface = new function(){
            
            this.showLogin = function(){
                $('#login').slideDown();
                $('#reg').hide();
                $('#waitWhileKey').hide();
            }
            this.showRegistration = function(){
                $('#login').show();
                $('#reg').slideDown();
            }
            
            
        };
        
        var reg = new function(){
            
            this.check = function(){
                
                
                        var valuee;
                        var check;
                        var checkBox;
                        var passwordCheck;
                        var usernameLengthCheck;
                        $(".checkReg").each(function() {
                            valuee = $(this).val();
                                if(valuee === ""){
                                    check = "FALSE";
                                }else{
                                    if(check === ""){
                                    check = "TRUE";
                                    }
                                }
                        });
                        if($('#regUsername').val().length < 3){
                            usernameLengthCheck = 'FALSE';
                        }
                        $(".checkRegBox").each(function() {
                            checkBox = $(this).is(':checked');
                                if(checkBox){
                                    checkBox = "TRUE";
                                }else{
                                    checkBox = "FALSE";
                                }
                        });
                        if($("#reg #regPassword").val() !== $("#reg #regRepeatPassword").val()){
                            passwordCheck = "FALSE";
                        }

                            if(check === "FALSE" || passwordCheck === "FALSE" || checkBox === "FALSE" || usernameLengthCheck === "FALSE"){
                                if(check === "FALSE"){
                                jsAlert('', "Please fill out all the fields");
                                }
                                if(usernameLengthCheck === "FALSE"){
                                jsAlert('', "Your Username needs at least three chars.");
                                }
                                if(checkBox === "FALSE"){
                                jsAlert('', "Your have to accept our terms.");
                                }
                                if(passwordCheck === "FALSE"){
                                jsAlert('', "Your passwords dont match.");
                                }
                            }else{
                                processRegistration();
                                //$("#regForm").submit();
                            }
            };
            
            this.process = function(){
                    var username = $("#reg #regUsername").val();
                    var password = $("#reg #regPassword").val();

                    //cypher password into two hashes
                    //passwordHash is used to cypher the password for db
                    //keyHash is used to encrypt the pricate Key
                    //
                    //salt is always the username just the position is switched

                    var passwordMD5 = hash.MD5(password);

                    var salt = hash.SHA512(randomString(64, '#aA'));  //generate salt, hash and parse it.
                    var passwordHash = hash.SHA512(salt+passwordMD5); //generate passwordhash

                    var keyHash = hash.SHA512(passwordMD5+salt);

                    var salt = symEncrypt(passwordMD5, salt); //encrypt salt, using md5-pw hash
                    //generate Keypair
                    var passtemp = $("#reg #regPassword").val();
                    var crypt;
                    var publicKey;
                    var privateKey;
                    crypt = new JSEncrypt({default_key_size: 4096});
                    $('#reg').hide();
                    $('#waitWhileKey').show();
                    crypt.getKey(function () {
                            privateKey = symEncrypt(keyHash, crypt.getPrivateKey()); //encrypt privatestring, usering the password hash
                            publicKey = crypt.getPublicKey();

                                //submit registration
                                $.post(sourceURL+"/api.php?action=processSiteRegistrationMobile", {
                                    username:username,
                                    password:passwordHash,
                                    salt:salt,
                                    publicKey:publicKey,
                                    privateKey:privateKey
                                    }, function(result){
                                                    var res = result;
                                                    if(res == 1){
                                                        //load checked message
                                                        jsAlert('', 'You just joined the universeOS');
                                                        $('#username').val(username);
                                                        $('#password').val(passtemp);
                                                        showLogin();
                                                    }else{
                                                        jsAlert('', res);
                                                    }
                                               }, "html");
                    });
            };
        };
        
        var userClass = new function(){
            this.checkUsername = function(){
	
                            var username = $("#"+id).val();
                            if(/^[a-zA-Z0-9- ]*$/.test(username) === false) {
                                $('#checkUsernameStatus').html('<a style="color: red">&nbsp;contains illegal characters</a>');
                            }else if(username.length > 2){

                            //check server for new messages
                            $.post(sourceURL+"/api.php?action=checkUsername", {
                                username:username
                                },
                                function(result){
                                var res = result;
                                if(res === "1"){

                                //load checked message
                                    $('#checkUsernameStatus').html('<a style="color: green">&nbsp;succes!</a>');
                                }else{
                                    $('#checkUsernameStatus').html('<a style="color: red">&nbsp;already in use</a>');
                                }
                                }, "html");
                            }else{

                            //html to short
                                $('#checkUsernameStatus').html('<o style="color: red">&nbsp;to short</o>');
                            }
                
            };
            
        };


	
        function showLogin(){
            $('#login').slideDown();
            $('#reg').hide();
            $('#waitWhileKey').hide();
        }
        function showRegistration(){
            $('#login').show();
            $('#reg').slideDown();
        }
        
        function checkUsername(id){
	
            var username = $("#"+id).val();
            if(/^[a-zA-Z0-9- ]*$/.test(username) === false) {
                $('#checkUsernameStatus').html('<a style="color: red">&nbsp;contains illegal characters</a>');
            }else if(username.length > 2){

            //check server for new messages
            $.post(sourceURL+"/api.php?action=checkUsername", {
                username:username
                },
                function(result){
                var res = result;
                if(res === "1"){

                //load checked message
                    $('#checkUsernameStatus').html('<a style="color: green">&nbsp;succes!</a>');
                }else{
                    $('#checkUsernameStatus').html('<a style="color: red">&nbsp;already in use</a>');
                }
                }, "html");
            }else{

            //html to short
                $('#checkUsernameStatus').html('<o style="color: red">&nbsp;to short</o>');
            }
    }
        function checkReg(){
                var valuee;
                var check;
                var checkBox;
                var passwordCheck;
                var usernameLengthCheck;
                $(".checkReg").each(function() {
                    valuee = $(this).val();
                        if(valuee === ""){
                            check = "FALSE";
                        }else{
                            if(check === ""){
                            check = "TRUE";
                            }
                        }
                });
                if($('#regUsername').val().length < 3){
                    usernameLengthCheck = 'FALSE';
                }
                $(".checkRegBox").each(function() {
                    checkBox = $(this).is(':checked');
                        if(checkBox){
                            checkBox = "TRUE";
                        }else{
                            checkBox = "FALSE";
                        }
                });
                if($("#reg #regPassword").val() !== $("#reg #regRepeatPassword").val()){
                    passwordCheck = "FALSE";
                }

                    if(check === "FALSE" || passwordCheck === "FALSE" || checkBox === "FALSE" || usernameLengthCheck === "FALSE"){
                        if(check === "FALSE"){
                        jsAlert('', "Please fill out all the fields");
                        }
                        if(usernameLengthCheck === "FALSE"){
                        jsAlert('', "Your Username needs at least three chars.");
                        }
                        if(checkBox === "FALSE"){
                        jsAlert('', "Your have to accept our terms.");
                        }
                        if(passwordCheck === "FALSE"){
                        jsAlert('', "Your passwords dont match.");
                        }
                    }else{
                        processRegistration();
                        //$("#regForm").submit();
                    }
        }
            
        function processRegistration(){
            var username = $("#reg #regUsername").val();
            var password = $("#reg #regPassword").val();

            //cypher password into two hashes
            //passwordHash is used to cypher the password for db
            //keyHash is used to encrypt the pricate Key
            //
            //salt is always the username just the position is switched

            var passwordMD5 = hash.MD5(password);
            
            var salt = hash.SHA512(randomString(64, '#aA'));  //generate salt, hash and parse it.
            var passwordHash = hash.SHA512(salt+passwordMD5); //generate passwordhash

            var keyHash = hash.SHA512(passwordMD5+salt);
            
            var salt = symEncrypt(passwordMD5, salt); //encrypt salt, using md5-pw hash
            //generate Keypair
            var passtemp = $("#reg #regPassword").val();
            var crypt;
            var publicKey;
            var privateKey;
            crypt = new JSEncrypt({default_key_size: 4096});
            $('#reg').hide();
            $('#waitWhileKey').show();
            crypt.getKey(function () {
                    privateKey = symEncrypt(keyHash, crypt.getPrivateKey()); //encrypt privatestring, usering the password hash
                    publicKey = crypt.getPublicKey();
                    
                        //submit registration
                        $.post(sourceURL+"/api.php?action=processSiteRegistrationMobile", {
                            username:username,
                            password:passwordHash,
                            salt:salt,
                            publicKey:publicKey,
                            privateKey:privateKey
                            }, function(result){
                                            var res = result;
                                            if(res == 1){
                                                //load checked message
                                                jsAlert('', 'You just joined the universeOS');
                                                $('#username').val(username);
                                                $('#password').val(passtemp);
                                                showLogin();
                                            }else{
                                                jsAlert('', res);
                                            }
                                       }, "html");
            });
        }

        function login(){
            var username = $("#login #username").val();
            var password = $("#login #password").val();
            var userid = usernameToUserid(username);

         //submit registration
            var passwordMD5 = hash.MD5(password);
            
            
            var salt = getSalt('auth', userid, passwordMD5);
            
            var passwordHash = hash.SHA512(salt+passwordMD5); //parse cypher object to string
	
                $.post(sourceURL+"/api.php?action=authentificate", {
                       username:username,
                       password:passwordHash
                       }, 
                       function(result){
                            var res = result;
                            if(res == 1){
                                localStorage.currentUser_userid = userid;
                                localStorage.currentUser_username = username;
                                localStorage.currentUser_passwordHash = passwordHash;
                                
                                localStorage.currentUser_passwordHashMD5 = passwordMD5; //only for internal use, to get salt
                                //load checked message
                                $('#offline').hide();
                                $('#loader').show();
                                $('#buddylistFrame').show();
                                $('#online').show();
                                getBuddylist();
                                showBuddylist();
                                reload();
                            }else{
                                jsAlert('', res);
                            }
                       }, "html");
	
        }

        function logout(){
            delete localStorage.currentUser_userid;
            delete localStorage.currentUser_username;
            delete localStorage.currentUser_passwordHash;
            window.location = './index.html';
            initApp();
        }
        
        function isLogin(){
            var user = localStorage.currentUser_userid;
            if(user){return true;
            }else{return false;
            }
        }
        
        function useridToUsername(id){
		if(usernames[id] == undefined){
			
		    var result="";
		    $.ajax({
		      url:sourceURL+"/api.php?action=useridToUsername",
		      async: false,  
			  type: "POST",
			  data: { userid : id },
		      success:function(data) {
		         result = data; 
		      }
		   });
		   usernames[id] = result;
		   return result;
		}else{
			return htmlentities(usernames[id]);
		}
		
	}
        
        function useridToRealname(id){
		if(realnames[id] == undefined){
			
		    var result="";
		    $.ajax({
		      url:sourceURL+"/api.php?action=useridToRealname",
		      async: false,  
			  type: "POST",
			  data: { userid : id },
		      success:function(data) {
		         result = data; 
		      }
		   });
		   realnames[id] = result;
		   return result;
		}else{
			return htmlentities(realnames[id]);
		}
		
	}
        
        function usernameToUserid(username){
		    var result="";
		    $.ajax({
		      url:sourceURL+"/api.php?action=usernameToUserid",
		      async: false,  
			  type: "POST",
			  data: { username : username },
		      success:function(data) {
		         result = data; 
		      }
		   });
		   usernames[result] = username;
		   return result;
		
	}
        function getLastActivity(userid){
                   var result="";
		    $.ajax({
		      url:sourceURL+"/api.php?action=getLastActivity",
		      async: false,  
			  type: "POST",
			  data: { userid : userid },
                        success:function(data) {
                           result = data; 
                        }
		   });
		   return parseInt(result);
        }
        
        function getUserPicture(query){
            var result;
            
            if(typeof query == 'array'){
                
                    var userids = JSON.stringify(query);
		    $.ajax({
		      url:sourceURL+"/api.php?action=getUserPicture",
		      async: false,  
			  type: "POST",
			  data: { userids : userids },
                        success:function(data) {
                           result = data; 
                            }
		   });
                
                
            }else{
                var userid = query;
                
		    $.ajax({
		      url:sourceURL+"/api.php?action=getUserPicture",
		      async: false,  
			  type: "POST",
			  data: { userid : userid },
                        success:function(data) {
                           result = data; 
                            }
		   });
            }
		   userPictures[userid] = result;
		   return htmlentities(result);	
	
	}
        
        function showUserPicture(userid){
            
            var userpicture = getUserPicture(userid);
            var lastActivity = getLastActivity(userid); //get last activity so the border of the userpicture can show if the user is online or offline
            
            var ret;
            ret = '<div class="userPicture userPicture_'+userid+'" style="background: url(\''+userpicture+'\'); '+getUserBorder(lastActivity)+'"></div>';

            $('.userPicture_'+userid).css('border', getUserBorder(lastActivity)); //update all shown pictures of the user
            
            return ret;
            
        }
        
        function getUserBorder(lastActivity){
        //every userpicture has a border, this border is green if the lastactivty defines that
        //the user is online and its red if the lastactivity defines that the user is offline.
        
            
            
            var border;
            if(lastActivity === 1){
                border = 'border-color: green';
            }else{
                border = 'border-color: red';
            }
            
            return border
        }
        
        function changeMainIconToUserpicture(userid){
            var userpicture = showUserPicture(userid);
            $('.navbar-brand').html(userpicture);
        }
        
        function mainIconToDefault(){
            $('.navbar-brand').html('<img src="img/logo.png" alt="logo" id="logo"/>');
        }
        
        function denyFriendRequest(userid){
            $.ajax({
              url:sourceURL+"/api.php?action=denyFriendRequest",
              async: false,  
              type: "POST",
              data: { 
                       userid:localStorage.currentUser_userid,
                       hash:localStorage.currentUser_passwordHash,
                       buddy: userid
                   },
              success:function(data) {
                  jsAlert('', 'The request has been removed.');
                  $('#openRequest_'+userid).hide();
                  $('#openRequest_'+userid).remove();
              }
            });
        }
        
        function replyFriendRequest(userid){
            
            $.ajax({
              url:sourceURL+"/api.php?action=replyFriendRequest",
              async: false,  
              type: "POST",
              data: { 
                       userid:localStorage.currentUser_userid,
                       hash:localStorage.currentUser_passwordHash,
                       buddy: userid
                   },
              success:function(data) {
                  jsAlert('', 'The user has been added to your buddylist.');
                  $('#openRequest_'+userid).hide();
              }
            });
        }
        
        function sendFriendRequest(userid){
        
        
        
            $.ajax({
              url:sourceURL+"/api.php?action=addBuddy",
              async: false,  
              type: "POST",
              data: { 
                       userid:localStorage.currentUser_userid,
                       hash:localStorage.currentUser_passwordHash,
                       buddy: userid
                   },
              success:function(data) {
                  if(data == 1){
                      
                    jsAlert('', 'Your request has been send');
                    //hide search result
                    $('#searchResult_'+userid).hide();
                  }else{
                     jsAlert('', 'The request couldn\'nt been send.');
                  }
              }
            });
        
        }
        
        function getOpenRequests(){
            
                var res = [];
                $.post(sourceURL+"/api.php?action=getOpenRequests", {
                       userid:localStorage.currentUser_userid,
                       hash:localStorage.currentUser_passwordHash
                       }, 
                       function(result){
                            if(result !== 'null'){
                                res = JSON.parse(result);
                                $.each(res, function( index, value ) {
                                    if(!$('#openRequest_'+index).length){

                                        var username = value;
                                        var realname = useridToRealname(index);
                                        var userpicture = showUserPicture(index);
                                        $('#openRequests').append('<li id="openRequest_'+index+'">'+userpicture+'<span class="username">'+username+'</span><br /><span class="realname">'+realname+' wants to be your friend</span></div><a href="#" onclick="denyFriendRequest(\''+index+'\');" class="btn btn-danger pull-right" style="margin-left: 5px;" id="denyRequestButton_'+index+'">decline</a><a href="#" onclick="replyFriendRequest(\''+index+'\');" class="btn btn-success pull-right" id="replyRequestButton_'+index+'">add</a></li>');

                                    }
                                });
                            }
                       }, "html");
        }
        
        function getBuddies(show, init){
                var res = [];
                $.post(sourceURL+"/api.php?action=getBuddylist", {
                       userid:localStorage.currentUser_userid,
                       hash:localStorage.currentUser_passwordHash
                       }, 
                       function(result){
                           if(result !== 'null'){
                               
                            res = JSON.parse(result);
                            var i=0;
                            $.each(res, function( index, value ) {
                                    
                                
                                    var username = useridToUsername(value);
                                    var realname = useridToRealname(value);
                                    var userpicture = showUserPicture(value);
                                    
                                    var lastActivity = getLastActivity(value);
                                    
                                    var show = false;
                                    
                                    
                                    //if user is not loaded
                                    if(typeof(shownUsers[value]) == 'undefined'){
                                        
                                      shownUsers[value] = lastActivity; //save lastActivity in the shownUsers array, so it can be used to decide if user is in the right list
                                      
                                      if(lastActivity === 1){
                                          $('.buddylist#onlineList').append('<li id="buddy_'+value+'" onclick="showDialoge(\''+value+'\')">'+userpicture+'<a href="#" onclick="showDialoge(\''+value+'\')"><span class="username">'+username+'</span><br /><span class="realname">'+realname+'</span></a></li>');
                                      }else{
                                          $('.buddylist#offlineList').append('<li id="buddy_'+value+'" onclick="showDialoge(\''+value+'\')">'+userpicture+'<a href="#" onclick="showDialoge(\''+value+'\')"><span class="username">'+username+'</span><br /><span class="realname">'+realname+'</span></a></li>');
                                      }
                                      
                                        
                                        
                                    }else{
                                      
                                        if(lastActivity != shownUsers[value]){
                                            
                                            if(lastActivity === 1){
                                                $('#buddy_'+value).remove();
                                                $('.buddylist#onlineList').append('<li id="buddy_'+value+'" onclick="showDialoge(\''+value+'\')">'+userpicture+'<a href="#" onclick="showDialoge(\''+value+'\')"><span class="username">'+username+'</span><br /><span class="realname">'+realname+'</span></a></li>');
                                            }else{
                                                $('#buddy_'+value).remove();
                                                $('.buddylist#offlineList').append('<li id="buddy_'+value+'" onclick="showDialoge(\''+value+'\')">'+userpicture+'<a href="#" onclick="showDialoge(\''+value+'\')"><span class="username">'+username+'</span><br /><span class="realname">'+realname+'</span></a></li>');
                                            }
                                            
                                        }
                                        
                                    }
                                    i++;
                                    if(i === res.length){
                                        if(show){
                                            showBuddylist();
                                        }
                                        $('#loader').remove();
                                    }
                                    
                                
                              });
                              
                           }
                       }, "html");
        }
        
        
        function getBuddylist(show, init) { 
                $('#online').show();
                getBuddies(show,init);
        }
        
        function reload(){
            
            
            //define interval (mil sec)
            var interval = [];
            interval['messages'] = 3000;
            interval['buddyRequests'] = 180000;
            interval['buddylist'] = 60000;
            
            
            
            
            setInterval(function()
            {
                reloadDialoges();
            }, interval['messages']);
            
            
            //because it takes 180 seconds untill getOpenRequests() is called,
            //it will be triggered once, before the intervall starts so that
            //open friend requests will be loaded on startup
            getOpenRequests();
            
            setInterval(function()
            {
                getOpenRequests();
            }, interval['buddyRequests']);
            
            setInterval(function()
            {
                getBuddies();
            }, interval['buddylist']);
            
        }
        
        function storeMessageKeyInLocalStorage(message,key){
            if(localStorage.storedMessageKeys){
                
                var keys = $.parseJSON(localStorage.storedMessageKeys);
                
            }else{
                var keys = [];
            }
            keys[message] = key;
            localStorage.storedMessageKeys = JSON.stringify(keys);

        }
        
        
        function storeMessageKey(messageId, key){
            if(localStorage.config_storeMessageKeys == "true"){
                storeMessageKeyInLocalStorage(messageId, key)
            }else{
                messageKeys[messageId] = key;
            }
        }
        
        function getStoredKey(messageId){
            var ret;
            if(localStorage.config_storeMessageKeys == "true"){
                var keys = $.parseJSON(localStorage.storedMessageKeys);
                ret = keys[messageId];
            }else{
                ret = messageKeys[messageId]
            }
            return ret;
        }
        
        function isStored(messageId){
            
            
            if(localStorage.config_storeMessageKeys == "true"){
                
                var keys = $.parseJSON(localStorage.storedMessageKeys);
                if(keys[messageId]){
                    return true;
                }else{
                    return false;
                }
                
                
            }else{
                
                if(messageKeys[messageId] !== undefined){
                    return true;
                }else{
                    return false;
                }
            }
        }
        
        function chatSubmitMessage(receiver){
            
            var value = $('#chatInput_'+receiver).val();
            
            var publicKey = getPublicKey('user', receiver); //get public key of receiver
            
            var randKey = Math.random().toString(36).slice(2)+Math.random().toString(36).slice(2)+Math.random().toString(36).slice(2); //random generated key for symetric encryption
            var message = symEncrypt(randKey, value); //encrypt message semitrically
            
            var symKey = asymEncrypt(publicKey, randKey);
            var message = symKey+'////message////'+message; //message = symetric Key + sym encoded message with key = symKey

            
            $.post(sourceURL+"/api.php?action=chatSendMessage", {
                       userid:localStorage.currentUser_userid,
                       hash:localStorage.currentUser_passwordHash,
                       receiver: receiver,
                       message: message
                       }, 
                       function(result){
                            var res = result;
                            if(res.length !== 0){
                                
                                storeMessageKey(res, randKey);
                                
                                $('#chatInput_'+receiver).val('');
                                loadDialoge(receiver, '0,25');
                                
                                $('#chatInput_'+receiver).focus();
                            }else{
                                jsAlert('', 'There was an error sending the message.');
                            }
                       }, "html");
                       
                       
            console.log(message);
            
        }
        
        function updateUnseenMessages(value){
            //debug
            $('#unseenMessages').hide();
            
            if(value !== 0){
                $('#unseenMessages').html(value);
                $('#unseenMessages').show();
            }else{
                $('#unseenMessages').html('');
            }
        }
        
        function markMessageAsRead(userid){
            
                $.post(sourceURL+"/api.php?action=markMessageAsRead", {
                       userid:localStorage.currentUser_userid,
                       hash:localStorage.currentUser_passwordHash,
                       buddy:userid
                       }, 
                       function(result){
                           
                       }, "html");
                       
               $('#overview_'+userid).removeClass('unseen');
        }
        
        
        function reloadDialoges(){
            $('#online').show();
            
            //check if lastMessageReceived is the last message saved in the db
            
            console.log('check server for messages...');
            $.post(sourceURL+"/api.php?action=getLastMessage", {
                       userid:localStorage.currentUser_userid,
                       hash:localStorage.currentUser_passwordHash
                       }, 
                       function(lastMessageOnServer){
                            
                            if(lastMessageReceived !== lastMessageOnServer && lastMessageOnServer.length > 0){
                                
                                console.log('need to update messages...'+lastMessageReceived+'::'+lastMessageOnServer+'::'+avoidLoop);

                                //emergency escape
                                avoidLoop++;
                                if(avoidLoop > 3){
                                    lastMessageReceived = lastMessageOnServer;
                                    avoidLoop = 0;
                                }
                                
                                $.post(sourceURL+"/api.php?action=getUnseenMessageAuthors", {
                                    userid:localStorage.currentUser_userid,
                                    hash:localStorage.currentUser_passwordHash
                                    }, 
                                    function(data){
                                        if(data !== null){
                                            

                                            var users = JSON.parse(data);

                                            $.each(users, function( index, user ) {

                                                loadDialoge(user, '0,25');

                                             });
                                        }else{
                                            avoidLoop = 3; //if there are not authors of unseen messages, there are no unseen messages => avoidLoop
                                        }

                                    }, "html");
                                 }else{
                                     
                                    avoidLoop = 0;
                                 }
        
        
        
                            }, "html");
        }
        
        function loadDialoge(receiver, limit){
            
            console.log('load dialoge');
            $.ajax({
              url:sourceURL+"/api.php?action=chatGetMessages",
              async: false,  
              type: "POST",
              data: { 
                       userid:localStorage.currentUser_userid,
                       hash:localStorage.currentUser_passwordHash,
                       receiver: receiver,
                       limit: limit
                   },
              success:function(data) {
                            var res;
                            if(data !== 'null'){
                                res = JSON.parse(data);
                                $.each(res, function( index, value ) {
                                
                                if(loadedMessages[index] === undefined){
                                    
                                    //get sender name
                                    var senderName;
                                    
                                    //get message content
                                    var messageContent = value['text'];
                                    
                                    //get message class
                                    var messageClass;
                                    var buddy;
                                    if(value['sender'] === localStorage.currentUser_userid){
                                        console.log('load message from user');
                                        messageClass = 'outgoing';
                                        buddy = value['receiver'];
                                        
                                        senderName = localStorage.currentUser_username;
                                        
                                        //check if key is stored in local storage
                                        if(isStored(index)){
                                            var messageContent = messageContent.split("////message////");
                                            var messageContent = symDecrypt(getStoredKey(index), messageContent[1]);
                                            console.log(messageContent);
                                        }else{
                                            messageContent = 'Key is not saved, written message can not be encrypted anymore';
                                        }
                                    }else{
                                        console.log('load message from buddy');
                                        messageClass = 'incoming';
                                        buddy = value['sender'];
                                        senderName = useridToUsername(buddy);
                                        
                                        var salt = getSalt('auth', localStorage.currentUser_userid, localStorage.currentUser_passwordHashMD5);
                                        var privateKey = getPrivateKey('user', localStorage.currentUser_userid, salt);
                                        
                                        
                                        //split message into array
                                        var messageContent = value['text'];
                                        var messageContent = messageContent.split("////message////");
                                        if(messageContent[0] !== null && messageContent[1] !== null){
                                            //encrypt random key with privateKey
                                            var randKey = asymDecrypt(privateKey, messageContent[0]);
                                            if(randKey !== null)
                                                //encrypt message with random key
                                                var messageContent = symDecrypt(randKey, messageContent[1]);
                                        }
                                    }

                                    //get right time format
                                    var date = new Date(value['timestamp']*1000);

                                    // will display time in 10:30:23 format
                                    var dateString = date.getHours() + ':' + date.getMinutes();


                                    
                                    //open dialoge if not opened already
                                    openDialoge(buddy);
                                    
                                    
                                    //avoid xss
                                    var messageContent = htmlentities(messageContent);
                                    
                                    console.log(typeof loadedMessages[index]);
                                    
                                    //mark message as read
                                    if($('#chatWindow_'+buddy).filter(':visible').length === 0 && value['read'] === '0' && messageClass === 'incoming'){
                                        unseenMessages++;
                                        updateUnseenMessages(unseenMessages);
                                        
                                        $('#overview_'+buddy).addClass('unseen');
                                        if(typeof navigator.notification !== 'undefined'){
                                            navigator.notification.vibrate(2000);
                                        }
                                        $('#lastMessage_'+buddy).html(messageContent);
                                    }else if($('#chatWindow_'+buddy).filter(':visible').length === 1 && value['read'] === '0' && messageClass === 'incoming'){
                                        //if chat window is open => mark message as seen
                                        markMessageAsRead(buddy);
                                    }
                                    
                                    //load message into dialoge
                                    $('#messageFrame_'+receiver).prepend('<li class="'+messageClass+'"><header>'+senderName+' - '+dateString+'</header><div>'+messageContent+'</div></footer></li>');
                                    loadedMessages[index] = true;
                                    //get sended message
                                    if(lastMessageReceived < index){
                                        lastMessageReceived = index;
                                    }
                                }
                                
                                });
                            }
              }
            });
        }
        
        function appendMessagesToDialoge(){
            
        }
        
        function openDialoge(userid){
            console.log('open dialoge...');
            if(!$('#chatWindow_'+userid).length){
                var username = useridToUsername(userid);
                var userpicture = showUserPicture(userid);
                
                $('#chatOverview').append('<li id="overview_'+userid+'" onclick="showDialoge(\''+userid+'\')">'+userpicture+'<a href="#"><span class="username">'+username+'</span><br /><span class="lastMessage" id="lastMessage_'+userid+'"></span></a></li>');
                $('#chatWindows').append('<div class="chatWindow mainFrame" id="chatWindow_'+userid+'"><header><div class="container">'+username+'</div></header><ul class="messageFrame" id="messageFrame_'+userid+'"></ul><footer><form id="chatForm_'+userid+'"><div><input type="text" id="chatInput_'+userid+'" class="chatInput" placeholder="please type a message"></div><div><input type="submit" class="btn btn-success btn-sm" value="SEND"></div></form></footer></div>');
                
                
                $('#chatForm_'+userid).submit(function(){
                    
                    console.log('send message');
                    event.preventDefault();
                    chatSubmitMessage(userid);
                });
                loadDialoge(userid, '0,25');
                
                    
                    
                openChatDialoges[userid] = true;
                
            }
        }
            
        function showDialoge(userid){
            
            
            
            $('#unseenMessages').html();
            
            console.log('show dialoge for user '+userid+'...');
            $('.navbar-nav li').removeClass('active');
            $('#overviewNav').addClass('active');
            
            
            if(!$('#chatWindow_'+userid).length){
                console.log('no dialoge exisiting...');
                openDialoge(userid);
            }
            
            $('.mainFrame').hide();
            $('#chatWindows').show();
            $('.chatWindow').hide();
            $('#chatWindow_'+userid).show();
            markMessageAsRead(userid);
            changeMainIconToUserpicture(userid);
        }
        
        function showBuddylist(){
            init.search();
            $('.navbar-nav li').removeClass('active');
            $('#buddylistNav').addClass('active');
            mainIconToDefault();
            $('#chatWindows').hide();
            $('.mainFrame').hide();
            $('#buddylistFrame').show();
            $('.buddylist').show();
        }
        
        
        function showOverview(){
            
            unseenMessages = 0;
            $('#unseenMessages').html('');
            
            mainIconToDefault();
            $('.navbar-nav li').removeClass('active');
            $('#overviewNav').addClass('active');
            
            $('#chatWindows').hide();
            $('.mainFrame').hide();
            $('#chatOverviewFrame').slideDown();
        }
        
var init = new function(){
    this.search = function(){
        
                //initalize search
                $("#search").on("input", function() {
                            if ($('#search').val()){
                            
                                
                                $('#searchResult').html('');
                                searchUserByString($('#search').val(), '0,10');
                                
                                
                            }else{
                                $('.buddylist').show();
                                $('#openRequests').show();
                                $('#searchResult').hide();
                            }
                });
                
                $('#searchForm').submit(function(e){
                    e.preventDefault();
                });
    };
};
        
        
        
//plugins
        
//plugins
        
//plugins
function htmlentities (string, quote_style, charset, double_encode) {
  // http://kevin.vanzonneveld.net
  // +   original by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
  // +    revised by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
  // +   improved by: nobbler
  // +    tweaked by: Jack
  // +   bugfixed by: Onno Marsman
  // +    revised by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
  // +    bugfixed by: Brett Zamir (http://brett-zamir.me)
  // +      input by: Ratheous
  // +   improved by: Rafał Kukawski (http://blog.kukawski.pl)
  // +   improved by: Dj (http://phpjs.org/functions/htmlentities:425#comment_134018)
  // -    depends on: get_html_translation_table
  // *     example 1: htmlentities('Kevin & van Zonneveld');
  // *     returns 1: 'Kevin &amp; van Zonneveld'
  // *     example 2: htmlentities("foo'bar","ENT_QUOTES");
  // *     returns 2: 'foo&#039;bar'
  var hash_map = this.get_html_translation_table('HTML_ENTITIES', quote_style),
    symbol = '';
  string = string == null ? '' : string + '';

  if (!hash_map) {
    return false;
  }

  if (quote_style && quote_style === 'ENT_QUOTES') {
    hash_map["'"] = '&#039;';
  }

  if (!!double_encode || double_encode == null) {
    for (symbol in hash_map) {
      if (hash_map.hasOwnProperty(symbol)) {
        string = string.split(symbol).join(hash_map[symbol]);
      }
    }
  } else {
    string = string.replace(/([\s\S]*?)(&(?:#\d+|#x[\da-f]+|[a-zA-Z][\da-z]*);|$)/g, function (ignore, text, entity) {
      for (symbol in hash_map) {
        if (hash_map.hasOwnProperty(symbol)) {
          text = text.split(symbol).join(hash_map[symbol]);
        }
      }

      return text + entity;
    });
  }

  return string;
}
function get_html_translation_table (table, quote_style) {
  // http://kevin.vanzonneveld.net
  // +   original by: Philip Peterson
  // +    revised by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
  // +   bugfixed by: noname
  // +   bugfixed by: Alex
  // +   bugfixed by: Marco
  // +   bugfixed by: madipta
  // +   improved by: KELAN
  // +   improved by: Brett Zamir (http://brett-zamir.me)
  // +   bugfixed by: Brett Zamir (http://brett-zamir.me)
  // +      input by: Frank Forte
  // +   bugfixed by: T.Wild
  // +      input by: Ratheous
  // %          note: It has been decided that we're not going to add global
  // %          note: dependencies to php.js, meaning the constants are not
  // %          note: real constants, but strings instead. Integers are also supported if someone
  // %          note: chooses to create the constants themselves.
  // *     example 1: get_html_translation_table('HTML_SPECIALCHARS');
  // *     returns 1: {'"': '&quot;', '&': '&amp;', '<': '&lt;', '>': '&gt;'}
  var entities = {},
    hash_map = {},
    decimal;
  var constMappingTable = {},
    constMappingQuoteStyle = {};
  var useTable = {},
    useQuoteStyle = {};

  // Translate arguments
  constMappingTable[0] = 'HTML_SPECIALCHARS';
  constMappingTable[1] = 'HTML_ENTITIES';
  constMappingQuoteStyle[0] = 'ENT_NOQUOTES';
  constMappingQuoteStyle[2] = 'ENT_COMPAT';
  constMappingQuoteStyle[3] = 'ENT_QUOTES';

  useTable = !isNaN(table) ? constMappingTable[table] : table ? table.toUpperCase() : 'HTML_SPECIALCHARS';
  useQuoteStyle = !isNaN(quote_style) ? constMappingQuoteStyle[quote_style] : quote_style ? quote_style.toUpperCase() : 'ENT_COMPAT';

  if (useTable !== 'HTML_SPECIALCHARS' && useTable !== 'HTML_ENTITIES') {
    throw new Error("Table: " + useTable + ' not supported');
    // return false;
  }

  entities['38'] = '&amp;';
  if (useTable === 'HTML_ENTITIES') {
    entities['160'] = '&nbsp;';
    entities['161'] = '&iexcl;';
    entities['162'] = '&cent;';
    entities['163'] = '&pound;';
    entities['164'] = '&curren;';
    entities['165'] = '&yen;';
    entities['166'] = '&brvbar;';
    entities['167'] = '&sect;';
    entities['168'] = '&uml;';
    entities['169'] = '&copy;';
    entities['170'] = '&ordf;';
    entities['171'] = '&laquo;';
    entities['172'] = '&not;';
    entities['173'] = '&shy;';
    entities['174'] = '&reg;';
    entities['175'] = '&macr;';
    entities['176'] = '&deg;';
    entities['177'] = '&plusmn;';
    entities['178'] = '&sup2;';
    entities['179'] = '&sup3;';
    entities['180'] = '&acute;';
    entities['181'] = '&micro;';
    entities['182'] = '&para;';
    entities['183'] = '&middot;';
    entities['184'] = '&cedil;';
    entities['185'] = '&sup1;';
    entities['186'] = '&ordm;';
    entities['187'] = '&raquo;';
    entities['188'] = '&frac14;';
    entities['189'] = '&frac12;';
    entities['190'] = '&frac34;';
    entities['191'] = '&iquest;';
    entities['192'] = '&Agrave;';
    entities['193'] = '&Aacute;';
    entities['194'] = '&Acirc;';
    entities['195'] = '&Atilde;';
    entities['196'] = '&Auml;';
    entities['197'] = '&Aring;';
    entities['198'] = '&AElig;';
    entities['199'] = '&Ccedil;';
    entities['200'] = '&Egrave;';
    entities['201'] = '&Eacute;';
    entities['202'] = '&Ecirc;';
    entities['203'] = '&Euml;';
    entities['204'] = '&Igrave;';
    entities['205'] = '&Iacute;';
    entities['206'] = '&Icirc;';
    entities['207'] = '&Iuml;';
    entities['208'] = '&ETH;';
    entities['209'] = '&Ntilde;';
    entities['210'] = '&Ograve;';
    entities['211'] = '&Oacute;';
    entities['212'] = '&Ocirc;';
    entities['213'] = '&Otilde;';
    entities['214'] = '&Ouml;';
    entities['215'] = '&times;';
    entities['216'] = '&Oslash;';
    entities['217'] = '&Ugrave;';
    entities['218'] = '&Uacute;';
    entities['219'] = '&Ucirc;';
    entities['220'] = '&Uuml;';
    entities['221'] = '&Yacute;';
    entities['222'] = '&THORN;';
    entities['223'] = '&szlig;';
    entities['224'] = '&agrave;';
    entities['225'] = '&aacute;';
    entities['226'] = '&acirc;';
    entities['227'] = '&atilde;';
    entities['228'] = '&auml;';
    entities['229'] = '&aring;';
    entities['230'] = '&aelig;';
    entities['231'] = '&ccedil;';
    entities['232'] = '&egrave;';
    entities['233'] = '&eacute;';
    entities['234'] = '&ecirc;';
    entities['235'] = '&euml;';
    entities['236'] = '&igrave;';
    entities['237'] = '&iacute;';
    entities['238'] = '&icirc;';
    entities['239'] = '&iuml;';
    entities['240'] = '&eth;';
    entities['241'] = '&ntilde;';
    entities['242'] = '&ograve;';
    entities['243'] = '&oacute;';
    entities['244'] = '&ocirc;';
    entities['245'] = '&otilde;';
    entities['246'] = '&ouml;';
    entities['247'] = '&divide;';
    entities['248'] = '&oslash;';
    entities['249'] = '&ugrave;';
    entities['250'] = '&uacute;';
    entities['251'] = '&ucirc;';
    entities['252'] = '&uuml;';
    entities['253'] = '&yacute;';
    entities['254'] = '&thorn;';
    entities['255'] = '&yuml;';
  }

  if (useQuoteStyle !== 'ENT_NOQUOTES') {
    entities['34'] = '&quot;';
  }
  if (useQuoteStyle === 'ENT_QUOTES') {
    entities['39'] = '&#39;';
  }
  entities['60'] = '&lt;';
  entities['62'] = '&gt;';


  // ascii decimals to real symbols
  for (decimal in entities) {
    if (entities.hasOwnProperty(decimal)) {
      hash_map[String.fromCharCode(decimal)] = entities[decimal];
    }
  }

  return hash_map;
}

function in_array (needle, haystack, argStrict) {
  // http://kevin.vanzonneveld.net
  // +   original by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
  // +   improved by: vlado houba
  // +   input by: Billy
  // +   bugfixed by: Brett Zamir (http://brett-zamir.me)
  // *     example 1: in_array('van', ['Kevin', 'van', 'Zonneveld']);
  // *     returns 1: true
  // *     example 2: in_array('vlado', {0: 'Kevin', vlado: 'van', 1: 'Zonneveld'});
  // *     returns 2: false
  // *     example 3: in_array(1, ['1', '2', '3']);
  // *     returns 3: true
  // *     example 3: in_array(1, ['1', '2', '3'], false);
  // *     returns 3: true
  // *     example 4: in_array(1, ['1', '2', '3'], true);
  // *     returns 4: false
  var key = '',
    strict = !! argStrict;

  if (strict) {
    for (key in haystack) {
      if (haystack[key] === needle) {
        return true;
      }
    }
  } else {
    for (key in haystack) {
      if (haystack[key] == needle) {
        return true;
      }
    }
  }

  return false;
}



function randomString(length, chars) {
	//nimphios at http://stackoverflow.com/questions/10726909/random-alpha-numeric-string-in-javascript
	
    var mask = '';
    if (chars.indexOf('a') > -1) mask += 'abcdefghijklmnopqrstuvwxyz';
    if (chars.indexOf('A') > -1) mask += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    if (chars.indexOf('#') > -1) mask += '0123456789';
    if (chars.indexOf('!') > -1) mask += '~`!@#$%^&*()_+-={}[]:";\'<>?,./|\\';
    var result = '';
    for (var i = length; i > 0; --i) result += mask[Math.round(Math.random() * (mask.length - 1))];
    return result;
}


function empty(value){
	if(value.length == 0) {
		return true;
	}else{
		return false;
	}
}