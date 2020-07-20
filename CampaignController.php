<?php
namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\File;

use FuelSdk\ET_Client;
use FuelSdk\ET_List;
use FuelSdk\ET_DataExtension;
use FuelSdk\ET_DataExtension_Row;
use App\Notification;
use DB;
use Hash;
use Auth;
use App\Http\Requests\CampaignRequest;
use App\Http\Requests\CmpBasicDetailRequest;
use App\Http\Requests\ReviewerRequest;
use App\Http\Requests\ApproverRequest;
use App\Http\Requests\AssignDeveloperRequest;
use App\Http\Requests\uploadVersion;
use Storage;
use Illuminate\Support\Facades\View;
use Illuminate\Support\Facades\Session;
use App\Libraries\xmlapi;
use Log;
use Monolog\Logger;
use Monolog\Handler\StreamHandler;



class CampaignController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth');
    }


    public function checkEmail(Request $request)
    { 

      $cmp_versions = CmpVersion::where('version_status','awaiting_proof')->get();

      $s3_url = config('settings.s3_url');
      $s3ServerUrl = config('settings.s3ServerUrl');
        foreach($cmp_versions as $key => $c) {
                    $ver_dir = $c->cmp_version;
                    $cmp_id = $c->cmp_id;

                    $path1 = "public/version_data";
                      if (!File::exists($path1)) {
                          File::makeDirectory($path1, 0775, true);
                      }


                    $path2 = "public/version_data/".$cmp_id;
                      if (!File::exists($path2)) {
                          File::makeDirectory($path2, 0755, true);
                      }

                    $path3 = "public/version_data/".$cmp_id.'/'.$ver_dir;
                      if (!File::exists($path3)) {
                          File::makeDirectory($path3, 0755, true);
                      }

                    $path3 = "public/version_data/".$cmp_id.'/'.$ver_dir.'/css';
                      if(!File::exists($path3)) {
                          File::makeDirectory($path3, 0755, true);
                      }


                      $path4 = "public/version_data/".$cmp_id.'/'.$ver_dir.'/js';
                      if (!File::exists($path4)) {
                          File::makeDirectory($path4, 0755, true);
                      }


                      $path5 = "public/version_data/".$cmp_id.'/'.$ver_dir.'/variants';
                      if (!File::exists($path5)) {
                          File::makeDirectory($path5, 0755, true);
                      }

                    $version_email = $c->version_email;
                    $hostname='{imap.gmail.com:993/imap/ssl}INBOX';
                    $username = $version_email."@*******";
                    $password = '***********';
                    $domainURL = '**********';
                    $inbox1 = imap_open('{'.$domainURL.':143/notls}INBOX',$username,$password) or die('Cannot connect to Tiriyo: ' . imap_last_error());
                    $emails1 = imap_search($inbox1,'UNSEEN');

                  if($emails1) {
                   /*it used to get all varients (Multiple email) Within 60 sec */
                    sleep(60);
                    $inbox = imap_open('{'.$domainURL.':143/notls}INBOX',$username,$password) or die('Cannot connect to Tiriyo: ' . imap_last_error());
                    $emails = imap_search($inbox,'UNSEEN');
                    rsort($emails);
                    $tabs = array();
                    $j = 1;
                  foreach($emails as $key=>$email_number) {
                 
                    $mess = imap_fetchbody($inbox,$email_number,2);
                    $filename = $j.'.html';
                    $complete_save_loc = $path5 .'/'. $filename;
                    file_put_contents($complete_save_loc, $mess);

                    $s3HtmlFileUrl = $s3_url.'version_data/'.$cmp_id.'/'.$ver_dir.'/variants/'.$filename;

                    $path = Storage::disk('s3')->put(
                              $s3HtmlFileUrl, #$path
                              @file_get_contents($complete_save_loc), #$fileContent
                             'public' #$visibility
                           );
                    $doc_url = $s3ServerUrl.$s3_url.'version_data/'.$cmp_id.'/'.$ver_dir.'/variants/'.$filename;


                    
                   $overview = imap_fetch_overview($inbox,$email_number,0);
                   $subject = $overview[0]->subject;     
                   if(strstr($subject, '=?UTF-8?B?') || strstr( $subject, '?=' )) {
                      $subject  = str_replace('=?UTF-8?B?' , '' , $subject);
                      $subject  = str_replace('?=' , '' , $subject);
                      $subject = base64_decode($subject);
                    }



                   
                   $check_exist_ver = VersionVariant::where('cmp_id',$cmp_id)->where('version_no',$c->cmp_version)->where('variant_no',$j)->first();

                  if(!$check_exist_ver){
                       $cmpVersion = new VersionVariant();
                       $cmpVersion->cmp_id = $cmp_id;
                       $cmpVersion->version_no = $c->cmp_version;
                       $cmpVersion->doc_url = $doc_url;
                       $cmpVersion->title = $subject;
                       $cmpVersion->subject_line = $subject;
                       $cmpVersion->cmp_user_id = $c->cmp_user_id;
                       $cmpVersion->version_status = 'draft';
                       $cmpVersion->variant_no = $j;
                       $cmpVersion->parent_id = $c->id;
                       $cmpVersion->save();
                       imap_setflag_full($inbox, $email_number, "\\Seen");
                  }

                   $j++;
                }
                    
              

                DB::table('cmp_versions')->where('cmp_id',$cmp_id)->where('cmp_version',$ver_dir)->update(['scrap_status'=>'pending','doc_url' => $doc_url,'version_status' => 'draft','is_variant' => 1]);

                DB::table('cmp_campaign')->where('id',$cmp_id)->update(['timeline_status' => 'Creative Ready']);

                /*cmp_id,ver_id,task_type,task,timeline_type*/
                endDeveloperUsertask($c->cmp_id,$c->cmp_user_id,$c->cmp_version,'Add Amend','Provide your feedback','feedback',$c->doc_type);   
                }

        return redirect('dashboard');

    }

   
    /**
     * Show the form for creating a new resource.
     * @return \Illuminate\Http\Response
     */

    public function create(){
        $loginAdminId = Auth::user()->id;
        $userDetial = User::where('id',$loginAdminId)->first();

        $isCreateCampaign = $userDetial['create_campaign'];

        if($isCreateCampaign==0){
            return redirect('/dashboard')->with('error','You Dont Have Primission To access This.');
        }
        $parentId = $userDetial['parent_id'];
        if($parentId>0){
            $ownerId = $parentId;
        }else{
            $ownerId = $loginAdminId;
        }

            $source_path = public_path().'/uploads/temp/'.$ownerId;
            // Identify directories
            $source = $source_path.'/';
            // Cycle through all source files
             if (file_exists($source_path)) {
                $files = scandir($source_path.'/');
                foreach ($files as $file) {
                  if (in_array($file, array(".",".."))) continue;
                  unlink($source.$file);
                }

            }


        $timelines = Timeline::orderBy('id','DESC')->where('client_id',$ownerId)->where('status','active')->get()->toArray();
        $users = User::where('parent_id',$ownerId)->get()->toArray();

        $reviewer = User::where('parent_id',$ownerId)->where('is_reviewer',1)->get()->toArray();

        $amend_providers = User::where('parent_id',$ownerId)->where('is_amend_provider',1)->get()->toArray();

        $approver = User::where('parent_id',$ownerId)->where('is_approver',1)->get()->toArray();

        $offerLayoutList = OfferLayout::orderBy('id', 'desc')->where('owner_id',$ownerId)->where('status','active')->get()->toArray();

        //$teams = Team::where('client_id',$ownerId)->with('reviewers','approvers')->get();
        $teams = Team::where('parent_id',$ownerId)->with('reviewers','approvers')->get();
            return view('campaigns.create',compact('timelines','offerLayoutList','users','teams','reviewer','approver','amend_providers'));
    }


    
      public function sendEmailTimeline(Request $request){
        $loginAdminId = Auth::user()->id;
        $start = date("Y-m-d H:i:s");
        $end = date('Y-m-d H:i:s',strtotime('+12 minutes',strtotime($start)));

        $emails = EmailNotification::where('is_complete','0')->where('send_time','<',$start)->get();
        $email_ids = array();
        foreach($emails as $e){
            $check_cmp_exist = CmpCampaign::find($e->cmp_id);

            if($check_cmp_exist){
            $name = getEmailByCmpUserName($e->cmp_user_id);

            $user_type = '';
            $get_user_type = getUserType($e->timeline_type);


            if($e->timeline_type == 'creative'){
                $user_type = 'Developer_Timeline';
            }
            else if($e->timeline_type == 'feedback'){
                $user_type = 'Reviewers_Timeline';
            }
            else if($e->timeline_type == 'amend'){
                $user_type = 'Developer_Timeline';
            }
            else if($e->timeline_type == 'sign_off'){
                $user_type = 'Approver_Timeline';
            }

            
            $email_template = EmailTemplate::where('slug',$user_type)->first();

            $data= array();

            $campaignInfo = CmpCampaign::find($e->cmp_id);
            $content = $email_template->content;
            $data['url'] = $e->page_link;
            $content = str_replace('#CMPNAME', $campaignInfo->title, $content);
            $content = str_replace('#URL', $data['url'], $content);
            $content = str_replace('#NAME', $name, $content);
            $data['content'] = $content;
            $email = getEmailByCmpUser($e->cmp_user_id);
            if($email != ''){
              $data['subject'] = $e->subject;
              $template = 'emails.email_notification';
              sendMailCampaignUser($template,$data,$email,$name,$data['subject'],$campaignInfo->notifications);
          
              $email_ids[] = $e->id;
            }

        }

    } 

    DB::table('email_notifications')->whereIn('id',$email_ids)->update(['is_complete' => '1']);


    }

}
