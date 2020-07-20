<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Auth;
use Session;
use App\Message;
use App\Conversation;
use App\Profile;
use App\Campaign;
use Validator;
use Illuminate\Support\Str;
use DB;
class MessageController extends Controller
{
    /**
     * Create a new controller instance.
     *
     * @return void
     */
    public function __construct()
    {
        $this->middleware('auth');
    }

    /**
     * Show the application dashboard.
     *
     * @return \Illuminate\Contracts\Support\Renderable
     */
    
    public function index()
    {   
        $conversations = Conversation::where('user_one', '=', Auth::user()->id)->orderBy('last_message_on', 'DESC')->get();
        return view('admin.sponsor.messagelist', compact('conversations')); 
    }
    /* athlete all chat messages */
    public function athleteindex()
    {   
        $conversations = Conversation::where('profile_user_id', '=', Auth::user()->id)->orderBy('last_message_on', 'DESC')->get();
        return view('admin.athlete.messagelist', compact('conversations')); 
    }

    /*Sponsor open chat box*/
    public function startchat($campaignID, $profileKey)
    {        
        $profile = Profile::where('profile_key', '=', $profileKey)->where('status', '=', 0)->first();
        $campaign = Campaign::where('id', '=', $campaignID)->where('sponsor_id', '=', Auth::user()->id)->first();
        if($profile && $campaign)
        {
            $hasConv = Conversation::where('user_one', '=', Auth::user()->id)->where('campaign_id', '=', $campaignID)->where('user_two', '=', $profileKey)->first();
            $conversationID = 0;
            if($hasConv)
            {
                $conversationID = $hasConv->id;               
            }
            return view('admin.sponsor.messagechat', compact('conversationID', 'profile', 'campaign'));
        }
        return redirect('sponsor/dashboard');  
    }

    /*Save Message Send By Sponsor To Profile*/
    public function savemessage(Request $request)
    {        
        $input = $request->all();

        $validator = $this->validate($request, [
            'conversation_id' => 'required|integer',
            'message' => 'required|string',
            'sender_id' => 'required|numeric',
            'receiver_id' => 'required',
            'campaign_id' => 'required|numeric',
        ]); 

        $conversationID = $input['conversation_id'];
        if($input['conversation_id'] == 0)
        {
            //Create Conversation If Not Exist 
            $newConv = new Conversation();
            $newConv->campaign_id = $input['campaign_id']; //Campaign ID
            $newConv->user_one = Auth::user()->id; //Sponsor ID
            $newConv->user_two = $input['receiver_id']; //Profile Unique key
            //No usage of notifiable_id
            $newConv->notifiable_id   = $input['notifiable_id']; // To whom send notification
            $newConv->profile_user_id = $input['notifiable_id']; //Same who in this case profile receive message
            if($newConv->save())
            {
                $conversationID = $newConv->id;
            } 
        }
        $conversation = Conversation::find($conversationID);
        if($conversation)
        {
            $message = new Message();
            $message->conversation_id = $conversationID;
            $message->sender_id = $input['sender_id'];
            $message->receiver_id = $input['receiver_id'];
            $message->message = $input['message'];            
            $message->notifiable_id = $input['notifiable_id'];
            $message->profile_user_id = $input['notifiable_id'];
            if($message->save())
            {
                $conversation->updateLastMessage();
                $view = view('admin.sponsor.chatbox')->with('conversation', $conversation)->render();
                return response()->json(['status'=> 1, 'message' => "success", 'conversation_id'=> $conversation->id, 'html' => $view, 'isHtml' => 1 ], 200);
            }
        }              
        return response()->json(['status'=> 0, 'message' => "failure", 'isHtml' => 0 ], 200);
    }

    public function getchat($conversationID)
    {
        $conversation = Conversation::find($conversationID);
        if($conversation)
        {
            $view = view('admin.sponsor.chatbox')->with('conversation', $conversation)->render();
            return response()->json(['status'=> 1, 'message' => "success", 'conversation_id'=> $conversation->id, 'html' => $view, 'isHtml' => 1 ], 200);
        }
        return response()->json(['status'=> 0, 'message' => "failure", 'isHtml' => 0 ], 200);
    }

    /*Athlete Get Chats*/
    public function getathletechat($conversationID)
    {
        $conversation = Conversation::find($conversationID);
        if($conversation)
        {
            $view = view('admin.athlete.chatbox')->with('conversation', $conversation)->render();
            return response()->json(['status'=> 1, 'message' => "success", 'conversation_id'=> $conversation->id, 'html' => $view, 'isHtml' => 1 ], 200);
        }
        return response()->json(['status'=> 0, 'message' => "failure", 'isHtml' => 0 ], 200);
    }

    /*Athlete open chat box*/
    public function athletestartchat($campaignID, $profileKey)
    {        
        $profile  = Profile::where('profile_key', '=', $profileKey)->where('status', '=', 0)->first();
        $campaign = Campaign::where('id', '=', $campaignID)->where('status', '=', 0)->first();
        if($profile)
        {
            $hasConv = Conversation::where('campaign_id', '=', $campaignID)->where('user_two', '=', $profileKey)->first();
            if($hasConv)
            {
                $conversation = Conversation::find($hasConv->id);
                return view('admin.athlete.messagechat', compact('conversation', 'profile'));
            }
            else
            {
                return redirect('athlete/messages');  
            }            
        }
        return redirect('athlete/messages');  
    }

    /*Save Message Send By Profile To Sponsor*/
    public function saveprofilemessage(Request $request)
    {        
        $input = $request->all();

        $validator = $this->validate($request, [
            'conversation_id' => 'required|integer',
            'message' => 'required|string'         
        ]); 

        $conversation = Conversation::find($input['conversation_id']);
        if($conversation)
        {
            $sender = $conversation['user_two']; //Athlete Login as profile
            $receiver = $conversation['user_one'];

            $message = new Message();
            $message->conversation_id = $input['conversation_id'];
            $message->sender_id = $sender;
            $message->receiver_id = $receiver;
            $message->message = $input['message'];
            $message->notifiable_id = $input['notifiable_id'];
            $message->profile_user_id = Auth::user()->id; //User who doing chat as profile.
            if($message->save())
            {
                $conversation->updateLastMessage();
                $view = view('admin.athlete.chatbox')->with('conversation', $conversation)->render();
                return response()->json(['status'=> 1, 'message' => "success", 'conversation_id'=> $conversation->id, 'html' => $view, 'isHtml' => 1 ], 200);
            }
        }        
        return response()->json(['status'=> 0, 'message' => "failure", 'isHtml' => 0 ], 200);
    }

    /*Message Notification For Sponsor and Athlete*/
    public function messagenotification()
    {
        //$mssg = Message::where('notifiable_id', Auth::user()->id)->groupBy('conversation_id')->latest()->get();  
        /*$mssg = Message::select( DB::raw('max(id) as id'))
        ->where('notifiable_id', Auth::user()->id)
        ->groupBy('conversation_id')
        ->pluck('id')->toArray();*/
        $mssg = Message::where('notifiable_id', Auth::user()->id)->WhereNull('read_at')->orderBy('created_at', 'DESC')->get();
        $mssage = [];
        $conversationArr = [];
        foreach($mssg as $m)
        {
            if(!in_array($m->conversation_id, $conversationArr)){
                $conversationArr[] = $m->conversation_id;

                $conversation = Conversation::find($m->conversation_id);
                if(is_numeric($m->sender_id))
                {
                    //Its Sponsor
                    $name = $conversation->profiletosponsor->first_name.' '.$conversation->profiletosponsor->last_name;
                    if (is_null($conversation->profiletosponsor->image))
                    {                        
                       $image = 'admin/assets/images/no-user-img.jpeg';
                    }
                    elseif(file_exists(public_path(). '/user-image/'.$conversation->profiletosponsor->image))
                    {
                        $image = 'user-image/'.$conversation->profiletosponsor->image;
                    }
                    else
                    {
                       $image = 'admin/assets/images/no-user-img.jpeg';
                    }
                    $url = '/athlete/messages/chat/'.$conversation->sponsorcampaign->id.'/'.$conversation->sponsortoprofile->profile_key;
                }
                else
                {
                    $name = $conversation->sponsortoprofile->first_name.' '.$conversation->sponsortoprofile->last_name;
                    if (is_null($conversation->sponsortoprofile->image))
                    {                        
                       $image = 'admin/assets/images/no-profile-img.png';
                    }
                    elseif(file_exists(public_path(). '/profile-image/'.$conversation->sponsortoprofile->image))
                    {
                        $image = 'profile-image/'.$conversation->sponsortoprofile->image;
                    }
                    else
                    {
                       $image = 'admin/assets/images/no-profile-img.png';
                    }
                    $url = '/sponsor/messages/chat/'.$conversation->sponsorcampaign->id.'/'.$conversation->sponsortoprofile->profile_key;
                }
                $mssage[$m->conversation_id]['name'] = $name;
                $mssage[$m->conversation_id]['campaign'] = $conversation->sponsorcampaign->title;
                $mssage[$m->conversation_id]['message'] = $m->message;
                $mssage[$m->conversation_id]['image'] = $image;
                $mssage[$m->conversation_id]['url'] = $url;
            }
        }
        $view = view('admin.msgnotification')->with('mssage', $mssage)->render();
        return response()->json(['status'=> 1, 'count' => count($mssage), 'html' => $view, 'isHtml' => 1 ], 200);
    }
}
