node ('slave_web2') {
    prepareEnv()

    stage ('Git Checkout'){
        checkout scm
    }
        if(release){
        /** Deployment */
        stage ('build') {
            def rsyncCmd = "rsync -e ssh -ravu --exclude .git . $serverIpAddress:$buildPath"

            echo "##### copying files using rsync #####"

            sh "$rsyncCmd"
            def BuildCmd = "cd $buildPath && npm install && npm run deploy:dev && pm2 restart all"

            echo "##### Restart pm2 and update the backend ######"
            
            sshPublisher(publishers: [
                    sshPublisherDesc(
                        configName: configName,
                        transfers: [sshTransfer(execCommand: "$BuildCmd",execTimeout: 900000)],
                        verbose: true
                    )
                ])
        }
    }
}

void prepareEnv(){

        if (env.BRANCH_NAME ==~ /^develop.*/) {
        buildPath = "/var/www/vhosts/pdss.mobelite.fr/pdss_web_back"
        environment = "develop"
        buildBranch = "develop"
        runBranch = "develop"
        release = true
        configName= "pdss-web"
        serverIpAddress="pdss-web@172.20.1.105"
        }
}
