
    octane.module('UiOverlay',function(cfg){
        
        var 
        bgContainer = octane.dom.bgContainer(),
        appContainer = octane.dom.appContainer(),
        viewContainer = octane.dom.viewContainer(),
        modalContainer = octane.dom.modalContainer(),
        Overlay, // controller
        Background, // controller
        AppContainer, // controller
        ModalContainer, // controller
        Velocity = Velocity || $.Velocity, // library
        method = octane.viewAnimationMethod || 'css';
        
    /* ------------------------------------------------------------------- */
    /*                            UTILITY                                  */
    /* ------------------------------------------------------------------- */
        
        function hasCssFilterSupport (enableWebkit){
            var 
            el,
            test1,
            test2,
            filter = 'filter:blur(2px)';

            //CSS3 filter is webkit. so here we fill webkit detection arg with its default
            if(enableWebkit === undefined) {
                enableWebkit = true;
            }
            //creating an element dynamically
            el = document.createElement('div');
            //adding filter-blur property to it
            el.style.cssText = (enableWebkit) ? '-webkit-'+filter : filter;
            //checking whether the style is computed or ignored
            test1 = (el.style.length !== 0);
            //checking for false positives of IE
            test2 = (
                document.documentMode === undefined //non-IE browsers, including ancient IEs
                || document.documentMode > 9 //IE compatibility mode
            );
            //combining test results
            return test1 && test2;
        }
        
        /* ------------------------------------------------------------------- */
        /*                            CONTROLLERS                              */
        /* ------------------------------------------------------------------- */
        
        ModalContainer = octane.controller('ModalContainerController').extend({
            // darken the modal background and disable click-thrus
            activate : {
                // css animation
                css : function(){
                        return new Promise(function(resolve){
                            modalContainer.classList.add('active');
                            setTimeout(resolve,405);
                        });          
                },
                // js animation with Velocity.js
                js : function(){
                        return new Promise(function(resolve){
                             Velocity(modalContainer,'fadeIn',{duration:400})
                             .then(function(){
                                modalContainer.classList.add('active');
                                return resolve();
                            });
                        });
                }           
            },
            // re-enable click-thrus and remove darkness
            deactivate :{
                css : function (){
                        return new Promise(function(resolve){
                            modalContainer.classList.remove('active');
                            setTimeout(resolve,505);
                        });
                },
                js : function(){
                        return new Promise(function(resolve){
                           Velocity(modalContainer,'fadeOut',{duration:500})
                            .then(function(){
                                modalContainer.classList.remove('active');
                                return resolve();
                           });
                        });
                }
            }
        });
        
        AppContainer = octane.controller('AppContainerController').extend({      
            hide : {
                css : function (){
                    return new Promise(function(resolve){
                        appContainer.classList.add('hidden');
                        setTimeout(resolve,305);
                    });
                },
                js : function(){
                    return new Promise(function(resolve){
                        Velocity(appContainer,'fadeOut',{duration:300})
                        .then(function(){
                            appContainer.classList.add('hidden');
                            return resolve();
                        });
                    });
                }
            },
            reveal : {
                css : function (){
                        return new Promise(function(resolve){
                            appContainer.classList.remove('hidden');
                            setTimeout(resolve,305);
                        });
                },
                js : function(){
                    return new Promise(function(resolve){
                        Velocity(appContainer,'fadeIn',{duration:300})
                         .then(function(){
                            appContainer.classList.remove('hidden');
                            return resolve();
                        });
                    });
                }
            }
        });
        
   
        
        Background = octane.controller('BackgroundController').extend({
            // swap out the app container with a static image of itself
            activate : {
                css : function(){
                    return new Promise(function(resolve){
                        bgContainer.classList.add('active');
                        setTimeout(resolve,305);
                    });
                },
                js : function(){
                    return new Promise(function(resolve){
                        Velocity(bgContainer,'fadeIn',{duration:300})
                         .then(function(){
                            bgContainer.classList.add('active');
                            resolve();
                        });
                    });
                }
            },
            deactivate : {
                css : function(){
                    return new Promise(function(resolve){
                        bgContainer.classList.remove('active');
                        setTimeout(resolve,305);
                    });
                },
                js : function(){
                    return new Promise(function(resolve){
                        Velocity(bgContainer,'fadeOut',{duration:300})
                        .then(function(){
                            bgContainer.classList.remove('active');
                            resolve();
                        });
                    });
                }
            },
            removeImage : function(){
                bgContainer.firstChild && bgContainer.removeChild(bgContainer.firstChild);
                return Promise.resolve();
            },
            // get the static image
            getImage : function (){
                return new Promise(function(resolve){
                    html2canvas(appContainer,{
                        onrendered : function(canvas){
                            bgContainer.firstChild && bgContainer.removeChild(bgContainer.firstChild);
                            bgContainer.appendChild(canvas);
                            resolve(canvas);
                        }
                    });
                });
            }    
        });
            
       
        Overlay = octane.controller('OverlayController').extend({
        
            on : function(){
                if(hasCssFilterSupport){    
                    return Background.activate[method]()
                            .then( ModalContainer.activate[method] )
                            .then( AppContainer.hide[method] );
                } else {
                    return ModalContainer.activate[method]();
                }
            },
            off : function(){
                if(hasCssFilterSupport){
                    return  AppContainer.reveal[method]()
                            .then( Background.deactivate[method] )
                            .then( ModalContainer.deactivate[method] );
                } else {
                    return ModalContainer.deactivte[method]();
                }
            }
        });
            
        
        this.initialize = function init(){
            //var $this = this;
            //backgroundController.getImage();
            // cache screenshot as soon as routing completes
            if(hasCssFilterSupport){
                octane.handle('routing:complete',function(){
                    Background.getImage();
                });
            }
        }
        
        this.export({
            on : Overlay.on,
            off : Overlay.off
            //getBackgroundImage : backgroundController.getImage.bind(backgroundController),
            //applySwapCanvas : backgroundController.applyCanvas.bind(backgroundController)
        });
        
    }); // end module
        